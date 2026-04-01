import type {
  EffectiveStaticProps,
  StandardSchemaV1,
  ToolkitResult,
  ToolSpec,
} from "@very-coffee/agent-identity";
import type { Tool } from "ai";

/**
 * Maps AI SDK {@link Tool} instances (from `@convex-dev/agent` / `createTool`) to
 * {@link ToolSpec} so {@link ToolkitResult} matches `@very-coffee/agent-identity` for
 * `IdentityClient.recordAgentTurn` / `createIdentityLink`.
 *
 * Identity hashing uses static/runtime props, not these handlers; the adapter is for
 * structural typing and optional future hashing of tool surfaces.
 */
export function toolToToolSpec(name: string, tool: Tool): ToolSpec {
  const t = tool as Tool & {
    execute?: (
      input: unknown,
      options?: unknown,
    ) => Promise<unknown> | AsyncIterable<unknown>;
  };
  return {
    name,
    description: tool.description,
    inputSchema: tool.inputSchema as StandardSchemaV1,
    instructions: tool.description ?? "",
    handler: async (_ctx, input, options) => {
      if (typeof t.execute !== "function") {
        throw new Error(`Tool "${name}" has no execute`);
      }
      return t.execute(input, options);
    },
  };
}

export function toolsRecordToToolSpecs(
  tools: Record<string, Tool>,
): Record<string, ToolSpec> {
  const out: Record<string, ToolSpec> = {};
  for (const [name, tool] of Object.entries(tools)) {
    out[name] = toolToToolSpec(name, tool);
  }
  return out;
}

export function toolkitResultForIdentity(args: {
  tools: Record<string, Tool>;
  instructions: string;
  effectiveStaticProps?: EffectiveStaticProps;
}): ToolkitResult {
  return {
    tools: toolsRecordToToolSpecs(args.tools),
    instructions: args.instructions,
    effectiveStaticProps: args.effectiveStaticProps,
  };
}
