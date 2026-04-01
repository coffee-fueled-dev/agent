import { edgeSchema, GraphClient, nodeSchema } from "@very-coffee/convex-graph";
import { v } from "convex/values";
import { components } from "./_generated/api";
import schema from "./schema";

export const graph = new GraphClient(components.graph, {
  nodes: [nodeSchema(schema, "memoryRecord", "memoryRecords")] as const,
  edges: [
    edgeSchema("SIMILAR_TO", v.object({ score: v.number() }), {
      directed: false,
    }),
  ] as const,
});
