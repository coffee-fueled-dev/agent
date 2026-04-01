import type { KnnApproxOptions, KnnEntry } from "../types.js";
import { buildKnnGraphExact } from "./exact.js";
import { dotPrefix, normalizePrefix } from "./math.js";
import { TopKHeap } from "./topk.js";
import { mulberry32, randGaussian } from "./rng.js";

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
 * LSH-style approximate k-NN (cosine on normalized vectors). Falls back to exact-like
 * scan when dimension is mixed or n is tiny.
 */
export function buildKnnGraphApprox(
  entries: KnnEntry[],
  k: number,
  options: KnnApproxOptions = {},
): Map<string, Map<string, number>> {
  const candidateBudget = options.candidateBudget ?? 256;
  const numTables = Math.max(1, options.numTables ?? 8);
  const bitsPerTable = Math.max(4, Math.min(24, options.bitsPerTable ?? 8));
  const seed = options.seed ?? 1;
  const probes = Math.max(0, options.probes ?? 2);

  const adj = new Map<string, Map<string, number>>();
  for (const e of entries) adj.set(e.id, new Map());

  const dim = allSameDim(entries);
  const n = entries.length;
  if (dim === null || dim === 0 || n <= k + 1) {
    return buildKnnGraphExact(entries, k);
  }

  const norms = new Float64Array(n * dim);
  const valid: boolean[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const emb = entries[i]?.embedding ?? [];
    const row = norms.subarray(i * dim, (i + 1) * dim);
    valid[i] = normalizePrefix(emb, dim, row);
  }

  const rand = mulberry32(seed);
  const totalPlanes = numTables * bitsPerTable;
  const planes = new Float64Array(totalPlanes * dim);
  for (let p = 0; p < totalPlanes; p++) {
    const row = planes.subarray(p * dim, (p + 1) * dim);
    let norm = 0;
    for (let d = 0; d < dim; d++) {
      const v = randGaussian(rand);
      row[d] = v;
      norm += v * v;
    }
    const inv = norm > 0 ? 1 / Math.sqrt(norm) : 0;
    for (let d = 0; d < dim; d++) row[d] = (row[d] ?? 0) * inv;
  }

  // hashCodes[table][i] = unsigned int of bits
  const hashCodes: number[][] = Array.from({ length: numTables }, () =>
    new Array(n).fill(0),
  );
  for (let t = 0; t < numTables; t++) {
    const base = t * bitsPerTable;
    for (let i = 0; i < n; i++) {
      if (!valid[i]) continue;
      const v = norms.subarray(i * dim, (i + 1) * dim);
      let code = 0;
      for (let b = 0; b < bitsPerTable; b++) {
        const h = planes.subarray((base + b) * dim, (base + b + 1) * dim);
        const s = dotPrefix(v, h, dim) >= 0 ? 1 : 0;
        code |= s << b;
      }
      const rowCodes = hashCodes[t];
      if (!rowCodes) continue;
      rowCodes[i] = code;
    }
  }

  const buckets: Map<number, number[]>[] = Array.from(
    { length: numTables },
    () => new Map(),
  );
  for (let t = 0; t < numTables; t++) {
    const map = buckets[t];
    const hc = hashCodes[t];
    if (!map || !hc) continue;
    for (let i = 0; i < n; i++) {
      const code = hc[i] ?? 0;
      let arr = map.get(code);
      if (!arr) {
        arr = [];
        map.set(code, arr);
      }
      arr.push(i);
    }
  }

  const collectCandidates = (i: number): Set<number> => {
    const out = new Set<number>();
    for (let t = 0; t < numTables; t++) {
      const hc = hashCodes[t];
      if (!hc) continue;
      const code = hc[i] ?? 0;
      const map = buckets[t];
      if (!map) continue;
      const addBucket = (c: number) => {
        const arr = map.get(c);
        if (!arr) return;
        for (const j of arr) {
          if (j !== i) out.add(j);
        }
      };
      addBucket(code);
      for (let p = 0; p < probes; p++) {
        const bit = p % bitsPerTable;
        addBucket(code ^ (1 << bit));
      }
    }
    return out;
  };

  const randFill = mulberry32(seed + 1337);
  const expandCandidates = (i: number, cand: Set<number>) => {
    const minNeed = Math.min(n - 1, Math.max(k + 1, candidateBudget));
    let iter = 0;
    while (cand.size < minNeed && iter < n * 4) {
      const j = Math.floor(randFill() * n);
      if (j !== i) cand.add(j);
      iter++;
    }
    for (let j = 0; j < n && cand.size < minNeed; j++) {
      if (j !== i) cand.add(j);
    }
  };

  for (let i = 0; i < n; i++) {
    const a = entries[i];
    if (!a) continue;
    const rowI = norms.subarray(i * dim, (i + 1) * dim);
    const cand = collectCandidates(i);
    if (cand.size < k + 1) expandCandidates(i, cand);
    const sorted = [...cand].sort((x, y) => x - y);
    const capped: number[] = [];
    for (let j = 0; j < sorted.length && capped.length < candidateBudget; j++) {
      const id = sorted[j];
      if (id !== undefined) capped.push(id);
    }
    const heap = new TopKHeap(k);
    for (const j of capped) {
      let sim: number;
      if (valid[i] && valid[j]) {
        const rowJ = norms.subarray(j * dim, (j + 1) * dim);
        sim = dotPrefix(rowI, rowJ, dim);
      } else {
        sim = 0;
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

  symmetrize(adj);
  return adj;
}
