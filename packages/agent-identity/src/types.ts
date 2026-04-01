import type { StandardSchemaV1 } from "./standard-schema.js";

export type EffectiveStaticProps = Record<string, unknown>;

/** Policy nodes are deduped by object identity in a Map (same as Convex sharedPolicy). */
export type SharedPolicy = {
  readonly id: string;
  readonly evaluate: (env: unknown) => Promise<boolean>;
};

export type ToolkitContext<Env = unknown> = {
  env: Env;
  namespace?: string;
  agentId?: string;
  agentName?: string;
};

export type PolicyResultMap = Map<SharedPolicy, boolean>;

/** Runtime tool shape; handler uses unknown for compositional typing across the graph. */
export type ToolSpec = {
  name: string;
  description?: string;
  inputSchema: StandardSchemaV1;
  instructions: string;
  handler: (
    ctx: unknown,
    input: unknown,
    options?: unknown,
  ) => Promise<unknown> | AsyncIterable<unknown>;
};

export type ToolkitResult<
  TOOLS extends Record<string, ToolSpec> = Record<string, ToolSpec>,
> = {
  tools: TOOLS;
  instructions: string;
  effectiveStaticProps?: EffectiveStaticProps;
};

export type Composable<
  STATIC_PROPS extends { kind: string; name: string } = {
    kind: string;
    name: string;
  },
  TOOLS extends Record<string, ToolSpec> = Record<string, ToolSpec>,
  Env = unknown,
> = {
  staticProps: STATIC_PROPS;
  policies: SharedPolicy[];
  evaluate: (
    ctx: ToolkitContext<Env>,
    resolvedPolicies?: PolicyResultMap,
  ) => Promise<ToolkitResult<TOOLS>>;
};

export type RegisteredAgentIdentity<STATIC_PROPS = unknown> = {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
  getStaticIdentityInput: () => STATIC_PROPS;
  getRuntimeIdentityInput: (runtimeStaticProps?: unknown) => unknown;
};
