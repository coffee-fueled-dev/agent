import { internalAction } from "_generated/server.js";
import { v } from "convex/values";
import {
  getBrowseExecutorApiUrl,
  getLocalShellSecret,
  isBrowseExecutorEnabled,
} from "env/executor.js";

export const execute = internalAction({
  args: {
    instruction: v.string(),
    startUrl: v.optional(v.string()),
    effort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
    maxSteps: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    if (!isBrowseExecutorEnabled()) {
      throw new Error(
        "Browser automation executor is not enabled. Set BROWSER_EXECUTOR_ENABLED=true and configure EXECUTOR_URL and LOCAL_SHELL_SECRET to match the executor (same as shell). The executor process must have LOCAL_AGENT=true and Browserbase / Google env vars — see apps/executor.",
      );
    }
    const url = getBrowseExecutorApiUrl();
    const secret = getLocalShellSecret();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        instruction: args.instruction,
        startUrl: args.startUrl,
        effort: args.effort ?? "low",
        maxSteps: args.maxSteps,
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err =
        typeof body.error === "string"
          ? body.error
          : JSON.stringify(body).slice(0, 400);
      throw new Error(`Executor returned ${res.status}: ${err}`);
    }
    if (body.ok !== true) {
      const err =
        typeof body.error === "string"
          ? body.error
          : JSON.stringify(body).slice(0, 400);
      throw new Error(err || "Browse executor returned ok: false");
    }
    return body;
  },
});
