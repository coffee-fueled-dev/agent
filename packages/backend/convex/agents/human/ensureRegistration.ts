import { collectToolStaticHashes } from "@very-coffee/agent-identity";
import { v } from "convex/values";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { identityClient } from "../../_clients/identity.js";
import { mutation } from "../../_generated/server.js";
import {
  getHumanToolkitStaticHash,
  humanToolsForIdentity,
} from "./humanToolkit.js";

/**
 * Idempotent: registers the human actor (`agentId` = namespace) and leaf tools in the identity component.
 * Safe to call on chat load before any human turn is recorded.
 */
export const ensureHumanAgentRegistration = mutation({
  args: { namespace: v.string(), ...SessionIdArg },
  returns: v.null(),
  handler: async (ctx, args) => {
    void args.sessionId;
    const staticHash = await getHumanToolkitStaticHash();
    await identityClient.registerAgentDefinition(ctx, {
      agentId: args.namespace,
      name: "User",
      staticHash,
    });
    const nameToHash = await collectToolStaticHashes(humanToolsForIdentity);
    for (const [toolKey, toolHash] of nameToHash) {
      await identityClient.registerToolDefinition(ctx, {
        toolKey,
        toolHash,
      });
    }
    return null;
  },
});
