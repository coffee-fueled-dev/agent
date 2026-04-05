import type { AgentAction } from "@browserbasehq/stagehand";
import { Stagehand } from "@browserbasehq/stagehand";
import { isLocalAgentEnabled } from "../fs/env.js";
import { runWithBrowserbaseRetries } from "./rateLimitRetry.js";

/** CUA agent instructions — bias toward fewer Gemini calls (RPM/TPM/RPD per https://ai.google.dev/gemini-api/docs/rate-limits). */
const BROWSE_SYSTEM_PROMPT =
  "You are a browser automation agent. Each action triggers a costly model call—minimize steps to stay within API rate limits (see Google Gemini limits: requests/minute, tokens/minute, requests/day). " +
  "Read visible text first; scroll only if the answer is not on screen. Do not explore unrelated links, open extra tabs, or repeat actions. " +
  "Complete the user's task on the current page with the fewest interactions; stop immediately once the task is satisfied.";

const GLOBAL_MAX_STEPS = 40;

type BrowseEffort = "low" | "medium" | "high";

/** Upper bound per effort tier; optional maxSteps is clamped to min(user, cap). */
function capForEffort(effort: BrowseEffort): number {
  switch (effort) {
    case "low":
      return 2;
    case "medium":
      return 4;
    case "high":
      return 8;
    default:
      return 2;
  }
}

const EFFORT_SUFFIX: Record<BrowseEffort, string> = {
  low: " Default to the absolute minimum: zero scrolling if the answer is visible; at most one short scroll if not. Never click navigational clutter (ads, menus) unless required. Finish in as few model steps as possible.",
  medium:
    " Stay efficient: no redundant clicks, no exploratory browsing. Scroll only in small increments until you can answer; avoid back-and-forth navigation.",
  high: " Use extra steps only when the task clearly requires multiple pages or complex UI—still avoid loops and duplicate actions.",
};

function parseEffort(raw: unknown): BrowseEffort {
  if (raw === "medium" || raw === "high" || raw === "low") {
    return raw;
  }
  return "low";
}

function resolveMaxSteps(effort: BrowseEffort, maxStepsRaw: unknown): number {
  const cap = Math.min(capForEffort(effort), GLOBAL_MAX_STEPS);
  if (typeof maxStepsRaw === "number" && Number.isFinite(maxStepsRaw)) {
    const requested = Math.min(
      Math.max(Math.floor(maxStepsRaw), 1),
      GLOBAL_MAX_STEPS,
    );
    return Math.min(requested, cap);
  }
  return cap;
}

const MAX_ACTIONS_RETURNED = 30;

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
}

function browserExecutorSecret(): string | undefined {
  return trim(process.env.BROWSER_EXECUTOR_SECRET);
}

function requireEnv(name: string): string {
  const v = trim(process.env[name]);
  if (!v) {
    throw new Error(
      `Missing ${name} on the executor process for browser automation.`,
    );
  }
  return v;
}

/** Gemini / Google key for CUA — matches Stagehand `providerEnvVarMap.google`. */
function requireGoogleModelApiKey(): string {
  const v =
    trim(process.env.GEMINI_API_KEY) ??
    trim(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ??
    trim(process.env.GOOGLE_API_KEY);
  if (!v) {
    throw new Error(
      "Missing Google API key for browser CUA: set GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or GOOGLE_API_KEY on the executor process.",
    );
  }
  return v;
}

function getCuaModelName(): string {
  return (
    trim(process.env.BROWSERBASE_STAGEHAND_CUA_MODEL) ??
    "google/gemini-2.5-computer-use-preview-10-2025"
  );
}

function compactActions(actions: AgentAction[]) {
  if (actions.length <= MAX_ACTIONS_RETURNED) {
    return { count: actions.length, truncated: false as const, items: actions };
  }
  return {
    count: actions.length,
    truncated: true as const,
    items: actions.slice(-MAX_ACTIONS_RETURNED),
  };
}

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function checkAuth(req: Request): boolean {
  const expected = browserExecutorSecret();
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

export const browserBrowseRoute = {
  POST: async (req: Request) => {
    if (!isLocalAgentEnabled()) return notFound();
    if (!checkAuth(req)) return unauthorized();

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";
    if (!instruction) {
      return Response.json(
        { error: "instruction is required" },
        { status: 400 },
      );
    }

    const startUrl =
      typeof body.startUrl === "string" && body.startUrl.trim() !== ""
        ? body.startUrl.trim()
        : undefined;
    const effort = parseEffort(body.effort);
    const maxSteps = resolveMaxSteps(effort, body.maxSteps);
    const browseSystemPrompt = BROWSE_SYSTEM_PROMPT + EFFORT_SUFFIX[effort];

    const apiKey = requireEnv("BROWSERBASE_API_KEY");
    const projectId = requireEnv("BROWSERBASE_PROJECT_ID");
    const googleApiKey = requireGoogleModelApiKey();
    const modelName = getCuaModelName();

    try {
      const payload = await runWithBrowserbaseRetries({}, async () => {
        // Model + key on Stagehand constructor: `init()` hits Browserbase + Stagehand API
        // (429 / Retry-After: https://docs.browserbase.com/guides/concurrency-rate-limits).
        const stagehand = new Stagehand({
          env: "BROWSERBASE",
          apiKey,
          projectId,
          model: {
            modelName,
            apiKey: googleApiKey,
          },
        });
        try {
          await stagehand.init();
          if (startUrl) {
            const page = stagehand.context.pages()[0];
            if (!page) {
              throw new Error(
                "No browser page available after Stagehand init.",
              );
            }
            await page.goto(startUrl);
          }
          const agent = stagehand.agent({
            mode: "cua",
            systemPrompt: browseSystemPrompt,
          });
          const result = await agent.execute({
            instruction,
            maxSteps,
            highlightCursor: true,
          });
          return {
            ok: true as const,
            success: result.success,
            message: result.message,
            completed: result.completed,
            usage: result.usage,
            actions: compactActions(result.actions),
            browserbaseSessionId: stagehand.browserbaseSessionID,
            browserbaseSessionUrl: stagehand.browserbaseSessionURL,
            browserbaseDebugUrl: stagehand.browserbaseDebugURL,
          };
        } finally {
          await stagehand.close().catch(() => {});
        }
      });
      return Response.json(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ ok: false, error: msg }, { status: 500 });
    }
  },
};
