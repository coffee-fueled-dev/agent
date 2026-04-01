import type { RegisteredAgentIdentity } from "./types.js";

export function defineAgentIdentity<STATIC_PROPS>(args: {
  agentId: string;
  name: string;
  staticProps: STATIC_PROPS;
}): RegisteredAgentIdentity<STATIC_PROPS> {
  return {
    agentId: args.agentId,
    name: args.name,
    staticProps: args.staticProps,
    getStaticIdentityInput: () => args.staticProps,
    getRuntimeIdentityInput: (runtimeStaticProps?: unknown) =>
      runtimeStaticProps ?? args.staticProps,
  };
}

export type { RegisteredAgentIdentity } from "./types.js";
