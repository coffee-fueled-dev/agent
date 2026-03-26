import { edgeSchema, nodeSchema } from "../graph/client";
import schema from "./schema";

export const graphConfig = {
  nodes: [nodeSchema(schema, "contextEntry", "contextEntries")] as const,
  edges: [edgeSchema("SIMILAR_TO", undefined, { directed: false })] as const,
};
