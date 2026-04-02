import {
  buildKnnGraphApprox,
  buildKnnGraphExact,
  type KnnEntry,
} from "./index.js";

type Impl = "baseline" | "exact" | "approx";
type Suite = "homogeneous" | "heterogeneous";
type Profile = "medium" | "large";

type BenchRecord = {
  ts: string;
  pkg: "@very-coffee/k-nearest-neighbors";
  impl: Impl;
  suite: Suite;
  profile: Profile;
  run: number;
  n: number;
  dim: number;
  k: number;
  ms: number;
  edgeCount: number;
  recallAtK?: number;
};

type BenchSummary = {
  ts: string;
  pkg: "@very-coffee/k-nearest-neighbors";
  type: "summary";
  impl: Impl;
  suite: Suite;
  profile: Profile;
  runs: number;
  p50: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  recallAvg?: number;
};

type AcceptanceRecord = {
  ts: string;
  pkg: "@very-coffee/k-nearest-neighbors";
  type: "acceptance";
  exactP90ImprovementPct: number;
  annRecallAvg: number;
  annP90Speedup: number;
  annTailRatio: number;
  passExactP90: boolean;
  passAnnRecall: boolean;
  passAnnSpeedup: boolean;
  passAnnTail: boolean;
  passAll: boolean;
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

function buildKnnGraphBaseline(
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
    scored.sort((x, y) => y.sim - x.sim);
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
  impl: Impl,
  suite: Suite,
  profile: Profile,
  times: number[],
  recalls: number[],
): BenchSummary {
  const sum = times.reduce((acc, v) => acc + v, 0);
  const recallAvg =
    recalls.length > 0
      ? recalls.reduce((acc, v) => acc + v, 0) / recalls.length
      : undefined;
  return {
    ts: new Date().toISOString(),
    pkg: "@very-coffee/k-nearest-neighbors",
    type: "summary",
    impl,
    suite,
    profile,
    runs: times.length,
    p50: percentile(times, 50),
    p90: percentile(times, 90),
    p99: percentile(times, 99),
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.length > 0 ? sum / times.length : 0,
    recallAvg,
  };
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

function edgeCount(graph: Map<string, Map<string, number>>): number {
  let count = 0;
  for (const neighbors of graph.values()) count += neighbors.size;
  return count;
}

function cfgFor(profile: Profile, suite: Suite) {
  const mediumN = Number(process.env.KNN_BENCH_MEDIUM_N ?? "800");
  const largeN = Number(process.env.KNN_BENCH_LARGE_N ?? "4000");
  const n =
    profile === "medium"
      ? mediumN
      : suite === "homogeneous"
        ? largeN
        : Math.max(1200, Math.floor(largeN * 0.85));
  const dim = suite === "homogeneous" ? 64 : 96;
  const k = 8;
  return { n, dim, k };
}

async function runImplSuite(
  impl: Impl,
  suite: Suite,
  profile: Profile,
  runs: number,
): Promise<{ records: BenchRecord[]; summary: BenchSummary }> {
  const { n, dim, k } = cfgFor(profile, suite);
  const records: BenchRecord[] = [];
  const times: number[] = [];
  const recalls: number[] = [];

  for (let run = 1; run <= runs; run++) {
    const entries = makeEntries(
      n,
      dim,
      run * 0.13 + (suite === "heterogeneous" ? 1.7 : 0),
    );
    const start = performance.now();

    let graph: Map<string, Map<string, number>>;
    let recall: number | undefined;

    if (impl === "baseline") {
      graph = buildKnnGraphBaseline(entries, k);
    } else if (impl === "exact") {
      graph = buildKnnGraphExact(entries, k);
    } else {
      graph = buildKnnGraphApprox(entries, k, {
        seed: 7 + run,
        numTables: 8,
        bitsPerTable: 8,
        probes: 2,
        candidateBudget: 256,
      });
      // recall sampled against exact on smaller subsets only
      const sampleN = Math.min(400, entries.length);
      const exactSample = buildKnnGraphExact(entries.slice(0, sampleN), k);
      const approxSample = buildKnnGraphApprox(entries.slice(0, sampleN), k, {
        seed: 7 + run,
        numTables: 8,
        bitsPerTable: 8,
        probes: 2,
        candidateBudget: 256,
      });
      recall = recallAtK(approxSample, exactSample);
      recalls.push(recall);
    }

    const ms = performance.now() - start;
    times.push(ms);
    records.push({
      ts: new Date().toISOString(),
      pkg: "@very-coffee/k-nearest-neighbors",
      impl,
      suite,
      profile,
      run,
      n,
      dim,
      k,
      ms,
      edgeCount: edgeCount(graph),
      recallAtK: recall,
    });
  }

  return { records, summary: summarize(impl, suite, profile, times, recalls) };
}

const mediumRuns = Number(process.env.KNN_BENCH_MEDIUM_RUNS ?? "10");
const largeRuns = Number(process.env.KNN_BENCH_LARGE_RUNS ?? "6");

const allResults = await Promise.all([
  runImplSuite("baseline", "homogeneous", "medium", mediumRuns),
  runImplSuite("exact", "homogeneous", "medium", mediumRuns),
  runImplSuite("baseline", "heterogeneous", "medium", mediumRuns),
  runImplSuite("exact", "heterogeneous", "medium", mediumRuns),
  runImplSuite("exact", "homogeneous", "large", largeRuns),
  runImplSuite("approx", "homogeneous", "large", largeRuns),
  runImplSuite("exact", "heterogeneous", "large", largeRuns),
  runImplSuite("approx", "heterogeneous", "large", largeRuns),
]);

const summaryMap = new Map(
  allResults.map((r) => [
    `${r.summary.impl}:${r.summary.suite}:${r.summary.profile}`,
    r.summary,
  ]),
);

function s(impl: Impl, suite: Suite, profile: Profile): BenchSummary {
  const value = summaryMap.get(`${impl}:${suite}:${profile}`);
  if (!value) {
    throw new Error(`missing summary for ${impl}:${suite}:${profile}`);
  }
  return value;
}

const exactP90ImprovementPct =
  ((s("baseline", "homogeneous", "medium").p90 -
    s("exact", "homogeneous", "medium").p90) /
    s("baseline", "homogeneous", "medium").p90) *
  100;

const annRecallAvg =
  ((s("approx", "homogeneous", "large").recallAvg ?? 0) +
    (s("approx", "heterogeneous", "large").recallAvg ?? 0)) /
  2;

const annP90Speedup =
  s("exact", "homogeneous", "large").p90 /
  Math.max(1e-9, s("approx", "homogeneous", "large").p90);

const annTailRatio =
  s("approx", "homogeneous", "large").p99 /
  Math.max(1e-9, s("approx", "homogeneous", "large").p90);

const acceptance: AcceptanceRecord = {
  ts: new Date().toISOString(),
  pkg: "@very-coffee/k-nearest-neighbors",
  type: "acceptance",
  exactP90ImprovementPct,
  annRecallAvg,
  annP90Speedup,
  annTailRatio,
  passExactP90: exactP90ImprovementPct >= 30,
  passAnnRecall: annRecallAvg >= 0.9,
  passAnnSpeedup: annP90Speedup >= 2,
  passAnnTail: annTailRatio <= 3.5,
  passAll: false,
};
acceptance.passAll =
  acceptance.passExactP90 &&
  acceptance.passAnnRecall &&
  acceptance.passAnnSpeedup &&
  acceptance.passAnnTail;

const timestamp = new Date().toISOString().replaceAll(":", "-");
const outPath = `.bench/knn-${timestamp}.jsonl`;
await Bun.$`mkdir -p .bench`;

const lines = [
  ...allResults.flatMap((r) => r.records.map((x) => JSON.stringify(x))),
  ...allResults.map((r) => JSON.stringify(r.summary)),
  JSON.stringify(acceptance),
].join("\n");
await Bun.write(outPath, `${lines}\n`);

console.log(
  `[knn bench] exact medium p90 improvement=${exactP90ImprovementPct.toFixed(1)}%`,
);
console.log(
  `[knn bench] approx large recall@k=${annRecallAvg.toFixed(3)} speedup(p90)=${annP90Speedup.toFixed(2)}x tailRatio=${annTailRatio.toFixed(2)}`,
);
console.log(
  `[knn bench] acceptance=${acceptance.passAll ? "PASS" : "FAIL"} wrote ${outPath}`,
);
