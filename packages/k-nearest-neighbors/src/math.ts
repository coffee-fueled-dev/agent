/** Cosine similarity matching the original implementation (min-length prefix). */
export function cosineSimilarity(a: number[], b: number[]): number {
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

/** L2 norm of prefix `len`. */
export function normPrefix(emb: number[], len: number): number {
  let s = 0;
  for (let i = 0; i < len; i++) s += (emb[i] ?? 0) ** 2;
  return Math.sqrt(s);
}

/** In-place normalize prefix to unit length; returns false if zero vector. */
export function normalizePrefix(
  emb: number[],
  len: number,
  out: Float64Array,
): boolean {
  const n = normPrefix(emb, len);
  if (n === 0) {
    out.fill(0);
    return false;
  }
  for (let i = 0; i < len; i++) out[i] = (emb[i] ?? 0) / n;
  return true;
}

export function dotPrefix(
  a: Float64Array,
  b: Float64Array,
  len: number,
): number {
  let s = 0;
  for (let i = 0; i < len; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}
