import type { EdgeDef } from "@very-coffee/convex-graph";
import { v } from "convex/values";
import { graph } from "../graph.js";

/**
 * Builds a `v.union` of memory merge link shapes from configured graph edges.
 * Edges with `properties` on the graph use top-level fields on the link (e.g. `score` for `SIMILAR_TO`).
 */
function memoryLinkBranch(def: EdgeDef) {
  const edgeLit = v.literal(def.label);
  if (def.properties !== undefined) {
    return v.object({
      edge: edgeLit,
      targetMemoryRecordId: v.id("memoryRecords"),
      score: v.number(),
    });
  }
  return v.object({
    edge: edgeLit,
    targetMemoryRecordId: v.id("memoryRecords"),
  });
}

function memoryLinkItemValidatorFromEdges(edges: readonly EdgeDef[]) {
  const branches = edges.map((d) => memoryLinkBranch(d));
  if (branches.length === 0) {
    throw new Error(
      "memoryLinkItemValidatorFromEdges: edges must be non-empty",
    );
  }
  const first = branches[0];
  if (first === undefined) {
    throw new Error("memoryLinkItemValidatorFromEdges: invariant broken");
  }
  if (branches.length === 1) {
    return first;
  }
  const second = branches[1];
  if (second === undefined) {
    throw new Error("memoryLinkItemValidatorFromEdges: invariant broken");
  }
  return v.union(first, second, ...branches.slice(2));
}

/** Convex validator for `mergeMemory` `memoryLinks`, derived from {@link graph}. */
export const memoryLinkItemValidator = memoryLinkItemValidatorFromEdges(
  graph.config.edges,
);
