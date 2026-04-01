/** Negative if `a` is worse than `b` (lower sim, or same sim and larger j). */
export function cmpSimJ(
  a: { sim: number; j: number },
  b: { sim: number; j: number },
): number {
  if (a.sim !== b.sim) return a.sim - b.sim;
  return b.j - a.j;
}

/**
 * Min-heap of size at most `k` where root is the worst among stored (for k-NN: lowest sim, then highest j on tie).
 */
export class TopKHeap {
  private readonly h: { sim: number; j: number }[] = [];

  constructor(private readonly k: number) {}

  get size(): number {
    return this.h.length;
  }

  private siftUp(i: number): void {
    const h = this.h;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (cmpSimJ(h[i]!, h[p]!) >= 0) break;
      [h[i], h[p]] = [h[p]!, h[i]!];
      i = p;
    }
  }

  private siftDown(i: number): void {
    const h = this.h;
    const n = h.length;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && cmpSimJ(h[l]!, h[smallest]!) < 0) smallest = l;
      if (r < n && cmpSimJ(h[r]!, h[smallest]!) < 0) smallest = r;
      if (smallest === i) break;
      [h[i], h[smallest]] = [h[smallest]!, h[i]!];
      i = smallest;
    }
  }

  /** Insert if better than current worst or heap not full. */
  offer(sim: number, j: number): void {
    const k = this.k;
    const h = this.h;
    const item = { sim, j };
    if (h.length < k) {
      h.push(item);
      this.siftUp(h.length - 1);
      return;
    }
    const root = h[0];
    // Replace worst only if `item` is better than root (root worse than item).
    if (!root || cmpSimJ(root, item) >= 0) return;
    h[0] = item;
    this.siftDown(0);
  }

  /** Drain into descending (sim, then j) order — best first. */
  drainSortedDesc(): { sim: number; j: number }[] {
    const h = [...this.h];
    h.sort((a, b) => -cmpSimJ(a, b));
    return h;
  }
}
