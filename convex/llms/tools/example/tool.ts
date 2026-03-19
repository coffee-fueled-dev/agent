import { z } from "zod/v4";
import { dynamicTool, withFormattedResults } from "../_libs/toolkit";
import { examplePolicy } from "../_policies/examplePolicy";

export const exampleTool = dynamicTool({
  name: "exampleTool" as const,
  policies: [examplePolicy],
  description: "This is an example tool.",
  args: z.object({
    message: z.string().describe("The message to echo back"),
  }),
  handler: async (_toolCtx, args) => {
    return await withFormattedResults(
      (async () => {
        return {
          message: args.message,
        };
      })(),
    );
  },
});
