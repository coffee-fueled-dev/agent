import { buildKnnGraph, type KnnEntry } from "./index";

type BenchRecord = {
  ts: string;
  pkg: "@very-coffee/k-nearest-neighbors";
  suite: "homogeneous" | "heterogeneous";
  run: number;
  n: number;
  dim: number;
  k: number;
  ms: number;
  edgeCount: number;
};

type BenchSummary = {
  ts: string;
  pkg: "@very-coffee/k-nearest-neighbors";
  type: "summary";
  suite: "homogeneous" | "heterogeneous";
  runs: number;
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
};

function makeEntries(n: number, dim: number, variant = 0): KnnEntry[] {
  const out: KnnEntry[] = [];
  for (let i = 0; i < n; i++) {
    const embedding: number[] = [];
    for (let d = 0; d < dim; d++) {
      const v = Math.sin(i * 0.17 + d * 0.31 + variant) + Math.cos(i * 0.07);
      embedding.push(v);
    }
    out.push({ id: `e${i}`, embedding });
  }
  return out;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

function summarize(
  suite: "homogeneous" | "heterogeneous",
  times: number[],
): BenchSummary {
  const sum = times.reduce((acc, v) => acc + v, 0);
  return {
    ts: new Date().toISOString(),
    pkg: "@very-coffee/k-nearest-neighbors",
    type: "summary",
    suite,
    runs: times.length,
    p50: percentile(times, 50),
    p90: percentile(times, 90),
    p99: percentile(times, 99),
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.length > 0 ? sum / times.length : 0,
  };
}

async function runSuite(
  suite: "homogeneous" | "heterogeneous",
  runs: number,
): Promise<{ records: BenchRecord[]; summary: BenchSummary }> {
  const records: BenchRecord[] = [];
  const times: number[] = [];

  for (let run = 1; run <= runs; run++) {
    const n =
      suite === "homogeneous"
        ? 250
        : [120, 180, 250, 320, 420][Math.floor(Math.random() * 5)] ?? 250;
    const dim =
      suite === "homogeneous"
        ? 64
        : [16, 32, 64, 96, 128][Math.floor(Math.random() * 5)] ?? 64;
    const k =
      suite === "homogeneous"
        ? 8
        : [4, 8, 12, 16][Math.floor(Math.random() * 4)] ?? 8;

    const entries = makeEntries(n, dim, run * 0.13);
    const start = performance.now();
    const graph = buildKnnGraph(entries, k);
    const ms = performance.now() - start;

    let edgeCount = 0;
    for (const neighbors of graph.values()) edgeCount += neighbors.size;

    records.push({
      ts: new Date().toISOString(),
      pkg: "@very-coffee/k-nearest-neighbors",
      suite,
      run,
      n,
      dim,
      k,
      ms,
      edgeCount,
    });
    times.push(ms);
  }

  return { records, summary: summarize(suite, times) };
}

const homogeneous = await runSuite("homogeneous", 30);
const heterogeneous = await runSuite("heterogeneous", 40);

const timestamp = new Date().toISOString().replaceAll(":", "-");
const outPath = `.bench/knn-${timestamp}.jsonl`;
await Bun.$`mkdir -p .bench`;

const lines = [
  ...homogeneous.records.map((r) => JSON.stringify(r)),
  JSON.stringify(homogeneous.summary),
  ...heterogeneous.records.map((r) => JSON.stringify(r)),
  JSON.stringify(heterogeneous.summary),
].join("\n");
await Bun.write(outPath, `${lines}\n`);

console.log(
  `[knn bench] homogeneous p90=${homogeneous.summary.p90.toFixed(2)} p99=${homogeneous.summary.p99.toFixed(2)} ms`,
);
console.log(
  `[knn bench] heterogeneous p90=${heterogeneous.summary.p90.toFixed(2)} p99=${heterogeneous.summary.p99.toFixed(2)} ms`,
);
console.log(`[knn bench] wrote ${outPath}`);
