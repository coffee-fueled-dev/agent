import { collectToolStaticHashes } from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { fingerprintClient } from "../../_clients/fingerprints.js";
import { mutation } from "../../_generated/server.js";
import { getHumanToolkitStaticHash, humanTools } from "./humanToolkit.js";

/**
 * Idempotent: registers the human actor (`agentId` = namespace) and leaf tools in the fingerprints component.
 * Safe to call on chat load before any human turn is recorded.
 */
export const ensureHumanAgentRegistration = mutation({
  args: { namespace: v.string(), ...SessionIdArg },
  returns: v.null(),
  handler: async (ctx, args) => {
    void args.sessionId;
    const staticHash = await getHumanToolkitStaticHash();
    const nameToHash = await collectToolStaticHashes(humanTools);
    await fingerprintClient.registerAgentAndTools(ctx, {
      agentId: args.namespace,
      name: "User",
      staticHash,
      tools: nameToHash,
    });
    return null;
  },
});
