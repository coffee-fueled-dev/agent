import { internal } from "../../../_generated/api";
import { isLocalAgentMode } from "../../../env";
import { toolPolicyQuery } from "../_libs/customFunctions";
import { sharedPolicy } from "../_libs/toolkit";

export const evaluate = toolPolicyQuery({
  args: {},
  handler: async (_ctx): Promise<boolean> => {
    return isLocalAgentMode();
  },
});

export const localModePolicy = sharedPolicy(
  internal.llms.tools._policies.localModePolicy.evaluate,
  "llms.tools._policies.localModePolicy.evaluate",
);
