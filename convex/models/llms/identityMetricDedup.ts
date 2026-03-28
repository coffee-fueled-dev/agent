import { defineTable } from "convex/server";
import { v } from "convex/values";

/** One row per unique (dedupKey) used for identity telemetry counters. */
export const identityMetricDedup = defineTable({
  key: v.string(),
}).index("by_key", ["key"]);
