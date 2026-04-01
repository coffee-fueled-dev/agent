export type KnnEntry = { id: string; embedding: number[] };

export type KnnApproxOptions = {
  /** Max candidates scored per node before top-k (default 256). */
  candidateBudget?: number;
  /** LSH tables (default 8). */
  numTables?: number;
  /** Bits per table / hyperplanes per table (default 8, clamped 4–24). */
  bitsPerTable?: number;
  /** RNG seed for reproducibility (default 1). */
  seed?: number;
  /** Extra 1-bit bucket probes per table (default 2). */
  probes?: number;
};

export type KnnBuildMode = "exact" | "approx";

export type KnnBuildOptions = {
  mode?: KnnBuildMode;
  approx?: KnnApproxOptions;
};
