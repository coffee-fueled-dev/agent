import type { NodeLabel } from "@very-coffee/convex-graph";
import { edgeSchema, GraphClient, nodeSchema } from "@very-coffee/convex-graph";
import { v } from "convex/values";
import { components } from "./_generated/api";
import schema from "./schema";

export type MemoryGraphEdgeDefs = typeof graph.config.edges;
export type MemoryGraphNodeDefs = typeof graph.config.nodes;
/** Ontology node kinds (graph labels); a memory may have one graph node per label. */
export type MemoryOntologyNodeLabel = NodeLabel<MemoryGraphNodeDefs>;

/** `memorySourceMap.contentSource.type` for rows that link an ontology graph node to the memory. */
export const GRAPH_ONTOLOGY_CONTENT_SOURCE_TYPE = "graphOntology" as const;

/** Default graph node label for file-backed memories (first merge creates the node). */
export const DEFAULT_FILE_MEMORY_ONTOLOGY_NODE_LABEL: MemoryOntologyNodeLabel =
  "Reference";

/** Default graph node label for manual/chat-created memories when none is passed. */
export const DEFAULT_MANUAL_MEMORY_ONTOLOGY_NODE_LABEL: MemoryOntologyNodeLabel =
  "Fact";

export const graph = new GraphClient(components.graph, {
  nodes: [
    nodeSchema(schema, "Fact", "memoryRecords"),
    nodeSchema(schema, "Preference", "memoryRecords"),
    nodeSchema(schema, "Procedure", "memoryRecords"),
    nodeSchema(schema, "Reference", "memoryRecords"),
  ] as const,
  edges: [
    edgeSchema("SIMILAR_TO", v.object({ score: v.number() }), {
      directed: false,
    }),
    edgeSchema("RELATES_TO", v.object({ relationship: v.string() }), {
      directed: true,
    }),
    edgeSchema("REFINES", v.object({ refinement: v.string() }), {
      directed: true,
    }),
  ] as const,
});

import { graphLabelValidatorsFromConfig } from "@very-coffee/convex-graph";

/** Validators for graph label strings, derived from {@link graph}. */
export const {
  nodeLabelValidator: memoryOntologyNodeLabelValidator,
  edgeLabelValidator: memoryGraphEdgeLabelValidator,
} = graphLabelValidatorsFromConfig(graph.config);
