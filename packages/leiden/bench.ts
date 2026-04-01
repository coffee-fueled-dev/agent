import { leiden, type Adjacency } from "./index";

type BenchRecord = {
  ts: string;
  pkg: "@very-coffee/leiden";
  suite: "homogeneous" | "heterogeneous";
  run: number;
  n: number;
  neighborsPerNode: number;
  resolution: number;
  ms: number;
  communities: number;
};

type BenchSummary = {
  ts: string;
  pkg: "@very-coffee/leiden";
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

function makeGraph(n: number, neighborsPerNode: number): Adjacency {
  const adj: Adjacency = new Map();
  for (let i = 0; i < n; i++) {
    const id = `n${i}`;
    adj.set(id, new Map());
  }
  for (let i = 0; i < n; i++) {
    const from = `n${i}`;
    const fromMap = adj.get(from)!;
    for (let j = 1; j <= neighborsPerNode; j++) {
      const toIdx = (i + j) % n;
      const to = `n${toIdx}`;
      fromMap.set(to, 1);
      adj.get(to)!.set(from, 1);
    }
  }
  return adj;
}

function makeClusteredGraph(
  clusterSizes: number[],
  pIntra: number,
  pInter: number,
): Adjacency {
  const ids: string[] = [];
  const clusterById = new Map<string, number>();
  let cursor = 0;
  for (let c = 0; c < clusterSizes.length; c++) {
    const size = clusterSizes[c] ?? 0;
    for (let i = 0; i < size; i++) {
      const id = `n${cursor++}`;
      ids.push(id);
      clusterById.set(id, c);
    }
  }
  const adj: Adjacency = new Map(ids.map((id) => [id, new Map()]));
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    if (!a) continue;
    const aMap = adj.get(a)!;
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j];
      if (!b) continue;
      const same = clusterById.get(a) === clusterById.get(b);
      const p = same ? pIntra : pInter;
      if (Math.random() < p) {
        const w = same ? 1 + Math.random() * 0.5 : 0.2 + Math.random() * 0.4;
        aMap.set(b, w);
        adj.get(b)!.set(a, w);
      }
    }
  }
  return adj;
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
    pkg: "@very-coffee/leiden",
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
    const graph =
      suite === "homogeneous"
        ? makeGraph(300, 6)
        : (() => {
            const options: number[][] = [
              [50, 70, 90, 120],
              [80, 110, 130],
              [40, 40, 40, 40, 40, 40],
              [120, 180],
            ];
            const sizes =
              options[Math.floor(Math.random() * options.length)] ?? [
                80, 110, 130,
              ];
            return makeClusteredGraph(
              sizes,
              0.08 + Math.random() * 0.08,
              0.005 + Math.random() * 0.02,
            );
          })();
    const neighborsPerNode = suite === "homogeneous" ? 6 : 0;
    const resolution = suite === "homogeneous" ? 1.0 : 0.7 + Math.random() * 1.2;

    const start = performance.now();
    const out = leiden(graph, resolution);
    const ms = performance.now() - start;
    const communities = new Set(out.values()).size;

    records.push({
      ts: new Date().toISOString(),
      pkg: "@very-coffee/leiden",
      suite,
      run,
      n: graph.size,
      neighborsPerNode,
      resolution,
      ms,
      communities,
    });
    times.push(ms);
  }

  return { records, summary: summarize(suite, times) };
}

const homogeneous = await runSuite("homogeneous", 30);
const heterogeneous = await runSuite("heterogeneous", 40);

const timestamp = new Date().toISOString().replaceAll(":", "-");
const outPath = `.bench/leiden-${timestamp}.jsonl`;
await Bun.$`mkdir -p .bench`;

const lines = [
  ...homogeneous.records.map((r) => JSON.stringify(r)),
  JSON.stringify(homogeneous.summary),
  ...heterogeneous.records.map((r) => JSON.stringify(r)),
  JSON.stringify(heterogeneous.summary),
].join("\n");
await Bun.write(outPath, `${lines}\n`);

console.log(
  `[leiden bench] homogeneous p90=${homogeneous.summary.p90.toFixed(2)} p99=${homogeneous.summary.p99.toFixed(2)} ms`,
);
console.log(
  `[leiden bench] heterogeneous p90=${heterogeneous.summary.p90.toFixed(2)} p99=${heterogeneous.summary.p99.toFixed(2)} ms`,
);
console.log(`[leiden bench] wrote ${outPath}`);
