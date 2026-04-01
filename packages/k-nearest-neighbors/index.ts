import { buildKnnGraphApprox } from "./src/approx.js";
import { buildKnnGraphExact } from "./src/exact.js";
import type { KnnBuildOptions, KnnEntry } from "./types.js";

export type {
  KnnApproxOptions,
  KnnBuildMode,
  KnnBuildOptions,
  KnnEntry,
} from "./types.js";

export { buildKnnGraphApprox, buildKnnGraphExact };

/**
 * Build a symmetrized k-NN graph.
 * Defaults to exact mode for backward compatibility.
 */
export function buildKnnGraph(
  entries: KnnEntry[],
  k: number,
  options: KnnBuildOptions = {},
): Map<string, Map<string, number>> {
  const mode = options.mode ?? "exact";
  if (mode === "approx") {
    return buildKnnGraphApprox(entries, k, options.approx);
  }
  return buildKnnGraphExact(entries, k);
}