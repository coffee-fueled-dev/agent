import { v } from "convex/values";
import { components } from "../_generated/api.js";
import { mutation } from "../_generated/server.js";

/** Runs the memory component’s graph label seed (for `bunx convex run` / dev bootstrap). */
export const seedMemoryGraphOntology = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(
      components.memory.public.ontology.seedMemoryGraphOntology,
      {},
    );
    return null;
  },
});
