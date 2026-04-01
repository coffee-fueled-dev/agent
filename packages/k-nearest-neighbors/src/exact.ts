import type { KnnEntry } from "../types.js";
import { cosineSimilarity, dotPrefix, normalizePrefix } from "./math.js";
import { TopKHeap } from "./topk.js";

function symmetrize(adj: Map<string, Map<string, number>>): void {
  for (const [nodeId, neighbors] of adj) {
    for (const [neighborId, weight] of neighbors) {
      const reverse = adj.get(neighborId) ?? new Map();
      const existing = reverse.get(nodeId) ?? 0;
      if (weight > existing) reverse.set(nodeId, weight);
    }
  }
}

function allSameDim(entries: readonly KnnEntry[]): number | null {
  if (entries.length === 0) return null;
  const d = entries[0]?.embedding.length ?? 0;
  for (let i = 1; i < entries.length; i++) {
    if ((entries[i]?.embedding.length ?? 0) !== d) return null;
  }
  return d;
}

/**
 * Exact symmetrized k-NN graph: same semantics as the original brute-force builder,
 * with pre-normalization + top-k heaps when all embeddings share one dimension.
 */
export function buildKnnGraphExact(
  entries: KnnEntry[],
  k: number,
): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>();
  for (const e of entries) adj.set(e.id, new Map());

  const dim = allSameDim(entries);
  if (dim !== null && dim > 0) {
    const n = entries.length;
    const norms = new Float64Array(n * dim);
    const valid: boolean[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const emb = entries[i]?.embedding ?? [];
      const row = norms.subarray(i * dim, (i + 1) * dim);
      valid[i] = normalizePrefix(emb, dim, row);
    }

    for (let i = 0; i < n; i++) {
      const a = entries[i];
      if (!a) continue;
      const rowI = norms.subarray(i * dim, (i + 1) * dim);
      const heap = new TopKHeap(k);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let sim: number;
        if (valid[i] && valid[j]) {
          const rowJ = norms.subarray(j * dim, (j + 1) * dim);
          sim = dotPrefix(rowI, rowJ, dim);
        } else {
          const b = entries[j];
          if (!b) continue;
          sim = cosineSimilarity(a.embedding, b.embedding);
        }
        heap.offer(sim, j);
      }
      const neighbors = adj.get(a.id) ?? new Map();
      for (const { sim, j } of heap.drainSortedDesc()) {
        const b = entries[j];
        if (!b) continue;
        neighbors.set(b.id, Math.max(neighbors.get(b.id) ?? 0, sim));
      }
    }
  } else {
    for (let i = 0; i < entries.length; i++) {
      const a = entries[i];
      if (!a) continue;
      const heap = new TopKHeap(k);
      for (let j = 0; j < entries.length; j++) {
        if (i === j) continue;
        const b = entries[j];
        if (!b) continue;
        heap.offer(cosineSimilarity(a.embedding, b.embedding), j);
      }
      const neighbors = adj.get(a.id) ?? new Map();
      for (const { sim, j } of heap.drainSortedDesc()) {
        const b = entries[j];
        if (!b) continue;
        neighbors.set(b.id, Math.max(neighbors.get(b.id) ?? 0, sim));
      }
    }
  }

  symmetrize(adj);
  return adj;
}
