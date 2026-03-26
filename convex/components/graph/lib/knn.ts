type Entry = { id: string; embedding: number[] };

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Build a symmetrized k-NN graph from embedding vectors using cosine similarity.
 *
 * For each entry, keeps the top-k most similar neighbors. The graph is then
 * symmetrized: if A appears in B's k-NN or B appears in A's k-NN, the edge
 * exists in both directions with the max observed weight.
 *
 * @returns Adjacency list: nodeId -> (neighborId -> weight)
 */
export function buildKnnGraph(
  entries: Entry[],
  k: number,
): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>();
  for (const e of entries) adj.set(e.id, new Map());

  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    const scored: { id: string; sim: number }[] = [];
    for (let j = 0; j < entries.length; j++) {
      if (i === j) continue;
      scored.push({
        id: entries[j].id,
        sim: cosineSimilarity(a.embedding, entries[j].embedding),
      });
    }
    scored.sort((x, y) => y.sim - x.sim);
    const topK = scored.slice(0, k);
    const neighbors = adj.get(a.id) ?? new Map();
    for (const { id, sim } of topK) {
      neighbors.set(id, Math.max(neighbors.get(id) ?? 0, sim));
    }
  }

  // Symmetrize: if A->B exists, ensure B->A with max weight
  for (const [nodeId, neighbors] of adj) {
    for (const [neighborId, weight] of neighbors) {
      const reverse = adj.get(neighborId) ?? new Map();
      const existing = reverse.get(nodeId) ?? 0;
      if (weight > existing) reverse.set(nodeId, weight);
    }
  }

  return adj;
}
