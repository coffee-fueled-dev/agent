"use node";

import { v } from "convex/values";
import { internal } from "../../../../_generated/api";
import { internalAction } from "../../../../_generated/server";
import { getLocalShellSecret, getLocalShellUrl } from "../../../../env";
import { assertWhitelistedShellCommand } from "./shellValidateNode";

/**
 * Loads whitelist from Convex (`getShellWhitelist` / `SHELL_COMMAND_WHITELIST` env),
 * validates with bash-parser in the Node.js runtime, then proxies to @agent/filesystem.
 */
export const executeLocalShell = internalAction({
  args: {
    command: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const names = await ctx.runQuery(
      internal.llms.tools.filesystem.runShell.shellWhitelist.getShellWhitelist,
      {},
    );
    assertWhitelistedShellCommand(args.command, new Set(names));

    const baseUrl = getLocalShellUrl();
    const secret = getLocalShellSecret();

    const res = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        command: args.command.trim(),
        agentId: args.agentId,
      }),
    });

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      const msg =
        body &&
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: string }).error === "string"
          ? (body as { error: string }).error
          : text || res.statusText;
      throw new Error(`Local shell HTTP ${res.status}: ${msg}`);
    }

    return body as {
      ok: true;
      stdout: string;
      stderr: string;
      exitCode: number;
      cwd: string;
    };
  },
});
