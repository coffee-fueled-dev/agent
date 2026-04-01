import { createTool } from "@convex-dev/agent";
import type { Tool, ToolCallOptions } from "ai";
import type { ToolRuntimeContext, ToolSpec } from "@very-coffee/agent-identity";
import type {
  ConvexAgentEnv,
  ToolExecutionContext,
} from "./customFunctions.js";

function createToolRuntimeContext(
  env: ConvexAgentEnv,
): ToolRuntimeContext<ConvexAgentEnv> {
  return {
    env,
    namespace: env.namespace,
    agentId: env.agentId,
    agentName: env.agentName,
  };
}

export function toolSpecToAgentTool(
  spec: ToolSpec,
  env: ConvexAgentEnv,
): Tool {
  return createTool<unknown, unknown, ToolExecutionContext>({
    description: spec.description,
    args: spec.inputSchema as never,
    handler: (_ctx, input, options: ToolCallOptions) =>
      spec.handler(createToolRuntimeContext(env), input, options),
  });
}

export function toolSpecsToAgentTools(
  tools: Record<string, ToolSpec>,
  env: ConvexAgentEnv,
): Record<string, Tool> {
  const out: Record<string, Tool> = {};
  for (const [name, spec] of Object.entries(tools)) {
    out[name] = toolSpecToAgentTool(
      {
        ...spec,
        name,
      },
      env,
    );
  }
  return out;
}
