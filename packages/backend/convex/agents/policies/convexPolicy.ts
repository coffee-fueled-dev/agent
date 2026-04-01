import { policy } from "@very-coffee/agent-identity";
import type { FunctionReference } from "convex/server";
import type { ConvexAgentEnv, ToolPolicyArgs } from "../lib/customFunctions.js";

export function convexPolicy(
  id: string,
  query: FunctionReference<"query", "internal", ToolPolicyArgs, boolean>,
) {
  return policy<ConvexAgentEnv>(id, async (env) => {
    return await env.runPolicyQuery(query);
  });
}
