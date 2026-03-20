import type { PolicyConfig } from "./components/policy/types.ts";

export const policyConfig = {
  accessTemplates: [
    { resourceType: "thread", actions: ["read", "write", "own"] },
  ],
  featureTemplates: [],
  scopeTypes: ["account"],
  relationTemplates: [],
} as const satisfies PolicyConfig;
