import type { StandardSchemaV1 } from "./standard-schema.js";
import type {
  Composable,
  PolicyResultMap,
  SharedPolicy,
  ToolkitContext,
  ToolkitResult,
  ToolSpec,
} from "./types.js";

export type ToolStaticProps<
  NAME extends string,
  INPUT,
  _Env = unknown,
> = {
  kind: "tool";
  name: NAME;
  description: string | undefined;
  inputSchema: StandardSchemaV1<INPUT>;
  policies: SharedPolicy[];
  instructions: string[] | undefined;
};

export type ToolRuntimeContext<Env = unknown> = {
  env: Env;
  namespace?: string;
  agentId?: string;
  agentName?: string;
};

export function tool<
  const NAME extends string,
  INPUT,
  OUTPUT,
  Env = unknown,
>(args: {
  name: NAME;
  description?: string;
  inputSchema: StandardSchemaV1<INPUT>;
  instructions?: string[];
  policies?: SharedPolicy[];
  handler: (
    ctx: ToolRuntimeContext<Env>,
    input: INPUT,
    options?: unknown,
  ) => Promise<OUTPUT> | AsyncIterable<OUTPUT>;
}): Composable<
  ToolStaticProps<NAME, INPUT, Env>,
  Record<NAME, ToolSpec>,
  Env
> {
  const policies = args.policies ?? [];
  const staticProps: ToolStaticProps<NAME, INPUT, Env> = {
    kind: "tool",
    name: args.name,
    description: args.description,
    inputSchema: args.inputSchema,
    policies,
    instructions: args.instructions,
  };

  async function evaluate(
    ctx: ToolkitContext<Env>,
    resolvedPolicies?: PolicyResultMap,
  ): Promise<ToolkitResult<Record<NAME, ToolSpec>>> {
    const resolved = resolvedPolicies ?? new Map<SharedPolicy, boolean>();

    for (const policy of policies) {
      const ok =
        resolved.get(policy) ?? (await policy.evaluate(ctx.env));
      resolved.set(policy, ok);
      if (!ok) {
        return {
          tools: {} as Record<NAME, ToolSpec>,
          instructions: "",
        };
      }
    }

    const toolCtx: ToolRuntimeContext<Env> = {
      env: ctx.env,
      namespace: ctx.namespace,
      agentId: ctx.agentId,
      agentName: ctx.agentName,
    };

    const spec: ToolSpec = {
      name: args.name,
      description: args.description,
      inputSchema: args.inputSchema,
      instructions: (args.instructions ?? []).join("\n\n"),
      handler: (_ctxUnknown, inputUnknown, options) =>
        args.handler(
          toolCtx,
          inputUnknown as INPUT,
          options,
        ),
    };

    return {
      tools: { [args.name]: spec } as Record<NAME, ToolSpec>,
      instructions: spec.instructions,
      effectiveStaticProps: staticProps as unknown as Record<string, unknown>,
    };
  }

  return { staticProps, policies, evaluate };
}
