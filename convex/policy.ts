import { components } from "./_generated/api";
import { PolicyClient } from "./components/policy/client";
import { policyConfig } from "./policy.config";

export const policy = new PolicyClient(components.policy, policyConfig);
