import { v } from "convex/values";
import { internalQuery } from "../../../../_generated/server";
import { getShellCommandWhitelistRaw } from "../../../../env";

/** Used when `SHELL_COMMAND_WHITELIST` env is unset (comma-separated command basenames). */
const DEFAULT_SHELL_WHITELIST = [
  "basename",
  "cat",
  "dirname",
  "echo",
  "false",
  "grep",
  "head",
  "ls",
  // "mkdir",
  "pwd",
  // "rm",
  "seq",
  "tail",
  // "touch",
  "true",
  "wc",
  "which",
  "yes",
] as const;

/**
 * Whitelist for `runShell` — configure via Convex env `SHELL_COMMAND_WHITELIST`
 * (comma-separated basenames, e.g. `ls,cat,grep`).
 */
export const getShellWhitelist = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (_ctx) => {
    const raw = getShellCommandWhitelistRaw();
    if (!raw) {
      return [...DEFAULT_SHELL_WHITELIST];
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },
});
