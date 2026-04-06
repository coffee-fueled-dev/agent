import type { EdgeDef } from "@very-coffee/convex-graph";
import { v } from "convex/values";
import { graph } from "../graph.js";

/**
 * Builds a `v.union` of memory merge link shapes from configured graph edges.
 * Property fields match {@link graph.ts} `edgeSchema` validators (flat on the link object).
 */
function memoryLinkBranch(def: EdgeDef) {
  const edgeLit = v.literal(def.label);
  const base = {
    edge: edgeLit,
    targetMemoryRecordId: v.id("memoryRecords"),
  };
  if (def.properties === undefined) {
    return v.object(base);
  }
  switch (def.label) {
    case "SIMILAR_TO":
      return v.object({ ...base, score: v.number() });
    case "RELATES_TO":
      return v.object({ ...base, relationship: v.string() });
    case "REFINES":
      return v.object({ ...base, refinement: v.string() });
    default:
      throw new Error(`memoryLinkBranch: unsupported edge ${def.label}`);
  }
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
