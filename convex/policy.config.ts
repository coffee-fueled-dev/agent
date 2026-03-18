import type { PolicyConfig } from "./components/policy/types.ts";

export const policyConfig = {
  accessTemplates: [],
  featureTemplates: [],
  scopeTypes: [],
  relationTemplates: [],
} as const satisfies PolicyConfig;
