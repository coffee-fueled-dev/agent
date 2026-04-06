import { v } from "convex/values";
import type { EdgeDef, GraphConfig, NodeDef } from "./types.js";

type VUnion = Parameters<typeof v.union>[number];

/**
 * Convex validators for node and edge **label strings** derived from a {@link GraphConfig}.
 * Use for mutation/query args that must match configured graph kinds.
 */
export function graphLabelValidatorsFromConfig<
  const N extends readonly NodeDef[],
  const E extends readonly EdgeDef[],
>(
  config: GraphConfig<N, E>,
): {
  nodeLabelValidator: VUnion;
  edgeLabelValidator: VUnion;
} {
  const nodeLabels = config.nodes.map((n) => n.label);
  const edgeLabels = config.edges.map((e) => e.label);
  return {
    nodeLabelValidator: unionLiterals(nodeLabels, "node"),
    edgeLabelValidator: unionLiterals(edgeLabels, "edge"),
  };
}

function unionLiterals(
  labels: readonly string[],
  kind: "node" | "edge",
): VUnion {
  if (labels.length === 0) {
    throw new Error(
      `graphLabelValidatorsFromConfig: ${kind} labels must be non-empty`,
    );
  }
  const literals = labels.map((l) => v.literal(l));
  const first = literals[0];
  if (first === undefined) {
    throw new Error(
      `graphLabelValidatorsFromConfig: ${kind} literals invariant broken`,
    );
  }
  if (literals.length === 1) {
    return first;
  }
  const second = literals[1];
  if (second === undefined) {
    throw new Error(
      `graphLabelValidatorsFromConfig: ${kind} literals invariant broken`,
    );
  }
  return v.union(first, second, ...literals.slice(2)) as VUnion;
}
