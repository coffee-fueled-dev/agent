import { v } from "convex/values";
import { internalAction } from "../../../../_generated/server.js";
import {
  getLocalShellSecret,
  getShellExecutorApiUrl,
  isShellExecutorEnabled,
} from "../../../../env/executor.js";

/** One host sandbox per tenant; matches executor `sandboxId` (see toolkit instructions for future per-thread subdirs). */
function sandboxIdFromTenant(namespace: string) {
  return namespace.replace(/[/\\:\0\n\r]/g, "_").slice(0, 240);
}

export const execute = internalAction({
  args: {
    command: v.string(),
    namespace: v.string(),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    if (!isShellExecutorEnabled()) {
      throw new Error(
        "Shell executor is not enabled. Set SHELL_EXECUTOR_ENABLED=true and configure SHELL_EXECUTOR_API_URL and SHELL_EXECUTOR_SECRET to match the HTTP tooling server.",
      );
    }
    const url = getShellExecutorApiUrl();
    const secret = getLocalShellSecret();
    const sandboxId = sandboxIdFromTenant(args.namespace);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        command: args.command,
        sandboxId,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Executor returned ${res.status}: ${text.slice(0, 400)}`);
    }
    return await res.json();
  },
});
