import { describe, expect, test } from "bun:test";
import {
  buildKnnGraph,
  buildKnnGraphApprox,
  buildKnnGraphExact,
  type KnnEntry,
} from "./index.js";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function buildKnnGraphNaive(
  entries: KnnEntry[],
  k: number,
): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>();
  for (const e of entries) adj.set(e.id, new Map());

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (!a) continue;
    const scored: { id: string; sim: number }[] = [];
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue;
      const b = entries[j];
      if (!b) continue;
      scored.push({
        id: b.id,
        sim: cosineSimilarity(a.embedding, b.embedding),
      });
    }
    scored.sort((x, y) => y.sim - x.sim || x.id.localeCompare(y.id));
    const topK = scored.slice(0, k);
    const neighbors = adj.get(a.id) ?? new Map();
    for (const { id, sim } of topK) {
      neighbors.set(id, Math.max(neighbors.get(id) ?? 0, sim));
    }
  }

  for (const [nodeId, neighbors] of adj) {
    for (const [neighborId, weight] of neighbors) {
      const reverse = adj.get(neighborId) ?? new Map();
      const existing = reverse.get(nodeId) ?? 0;
      if (weight > existing) reverse.set(nodeId, weight);
    }
  }
  return adj;
}

function edgeSet(adj: Map<string, Map<string, number>>): Set<string> {
  const out = new Set<string>();
  for (const [a, neigh] of adj) {
    for (const b of neigh.keys()) out.add(`${a}->${b}`);
  }
  return out;
}

function recallAtK(
  approx: Map<string, Map<string, number>>,
  exact: Map<string, Map<string, number>>,
): number {
  let hit = 0;
  let total = 0;
  for (const [id, exactN] of exact) {
    const approxN = approx.get(id) ?? new Map();
    for (const n of exactN.keys()) {
      total++;
      if (approxN.has(n)) hit++;
    }
  }
  return total === 0 ? 1 : hit / total;
}

describe("k-nearest-neighbors", () => {
  test("default buildKnnGraph uses exact mode", () => {
    const entries: KnnEntry[] = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [0.9, 0.1] },
      { id: "c", embedding: [0, 1] },
    ];
    const out = buildKnnGraph(entries, 1);
    expect(out.size).toBe(3);
    expect(out.get("a")?.size).toBeGreaterThan(0);
  });

  test("exact matches naive on small dataset", () => {
    const entries: KnnEntry[] = [
      { id: "a", embedding: [1, 0, 0] },
      { id: "b", embedding: [0.9, 0.1, 0] },
      { id: "c", embedding: [0, 1, 0] },
      { id: "d", embedding: [0, 0, 1] },
      { id: "e", embedding: [0.5, 0.4, 0.1] },
    ];
    const exact = buildKnnGraphExact(entries, 2);
    const naive = buildKnnGraphNaive(entries, 2);
    expect(edgeSet(exact)).toEqual(edgeSet(naive));
  });

  test("exact has deterministic tie behavior", () => {
    const entries: KnnEntry[] = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [1, 0] },
      { id: "c", embedding: [1, 0] },
      { id: "d", embedding: [0, 1] },
    ];
    const r1 = buildKnnGraphExact(entries, 2);
    const r2 = buildKnnGraphExact(entries, 2);
    expect(edgeSet(r1)).toEqual(edgeSet(r2));
  });

  test("approx produces symmetric graph and deterministic seeding", () => {
    const entries: KnnEntry[] = [];
    for (let i = 0; i < 120; i++) {
      entries.push({
        id: `e${i}`,
        embedding: [Math.sin(i), Math.cos(i), Math.sin(i * 0.3), Math.cos(i * 0.7)],
      });
    }
    const a = buildKnnGraphApprox(entries, 8, { seed: 7 });
    const b = buildKnnGraphApprox(entries, 8, { seed: 7 });
    expect(edgeSet(a)).toEqual(edgeSet(b));
    for (const [id, neigh] of a) {
      for (const [other, w] of neigh) {
        const rw = a.get(other)?.get(id) ?? 0;
        expect(rw).toBeGreaterThanOrEqual(w);
      }
    }
  });

  test("approx recall smoke test vs exact", () => {
    const entries: KnnEntry[] = [];
    for (let i = 0; i < 220; i++) {
      const base = i < 110 ? 0 : 10;
      entries.push({
        id: `e${i}`,
        embedding: [
          Math.sin(i * 0.07) + base,
          Math.cos(i * 0.13) + base,
          Math.sin(i * 0.17),
          Math.cos(i * 0.19),
          Math.sin(i * 0.23),
          Math.cos(i * 0.29),
        ],
      });
    }
    const exact = buildKnnGraphExact(entries, 8);
    const approx = buildKnnGraphApprox(entries, 8, {
      seed: 42,
      numTables: 10,
      bitsPerTable: 10,
      probes: 4,
      candidateBudget: 512,
    });
    expect(recallAtK(approx, exact)).toBeGreaterThanOrEqual(0.9);
  });
});
