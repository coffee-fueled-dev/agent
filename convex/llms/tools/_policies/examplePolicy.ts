import { internal } from "../../../_generated/api";
import { toolPolicyQuery } from "../_libs/customFunctions";
import { sharedPolicy } from "../_libs/toolkit";

export const evaluate = toolPolicyQuery({
  args: {},
  handler: async (_ctx): Promise<boolean> => {
    return true;
  },
});

export const examplePolicy = sharedPolicy(
  internal.llms.tools._policies.examplePolicy.evaluate,
  "llms.tools._policies.examplePolicy.evaluate",
);
