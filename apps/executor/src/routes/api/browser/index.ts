import type { AgentAction } from "@browserbasehq/stagehand";
import { Stagehand } from "@browserbasehq/stagehand";
import { getLocalShellSecret, isLocalAgentEnabled } from "../fs/env.js";

const secret = getLocalShellSecret();

const BROWSE_SYSTEM_PROMPT =
  "You are a browser automation agent. Complete the user's task on the current page. Be concise and avoid unnecessary actions.";

const MAX_ACTIONS_RETURNED = 30;

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t === "" ? undefined : t;
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
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
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
    const maxStepsRaw = body.maxSteps;
    const maxSteps =
      typeof maxStepsRaw === "number" && Number.isFinite(maxStepsRaw)
        ? Math.min(Math.max(Math.floor(maxStepsRaw), 1), 40)
        : 20;

    const apiKey = requireEnv("BROWSERBASE_API_KEY");
    const projectId = requireEnv("BROWSERBASE_PROJECT_ID");
    const googleApiKey = requireGoogleModelApiKey();
    const modelName = getCuaModelName();

    // Model + key must be set on the Stagehand constructor: `init()` calls the
    // Browserbase Stagehand API with `modelApiKey` before `agent()` runs.
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
          throw new Error("No browser page available after Stagehand init.");
        }
        await page.goto(startUrl);
      }
      const agent = stagehand.agent({
        mode: "cua",
        systemPrompt: BROWSE_SYSTEM_PROMPT,
      });
      const result = await agent.execute({
        instruction,
        maxSteps,
        highlightCursor: true,
      });
      return Response.json({
        ok: true,
        success: result.success,
        message: result.message,
        completed: result.completed,
        usage: result.usage,
        actions: compactActions(result.actions),
        browserbaseSessionId: stagehand.browserbaseSessionID,
        browserbaseSessionUrl: stagehand.browserbaseSessionURL,
        browserbaseDebugUrl: stagehand.browserbaseDebugURL,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ ok: false, error: msg }, { status: 500 });
    } finally {
      await stagehand.close();
    }
  },
};
