import { v } from "convex/values";
import { mutation } from "../_generated/server.js";
import { graph } from "../graph.js";

/** Idempotent: ensures `graph_labels` rows exist for configured node and edge kinds. */
export const seedMemoryGraphOntology = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const value of graph.labels.staticList("node")) {
      await graph.labels.upsert(ctx, { type: "node", value });
    }
    for (const value of graph.labels.staticList("edge")) {
      await graph.labels.upsert(ctx, { type: "edge", value });
    }
    return null;
  },
});
