import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api.js";

/** Parallel merge batches across streams; same-stream ordering via OCC on memoryRecords.nextChunkSeq. */
export const mergeMemoryPool = new Workpool(components.mergeMemoryWorkpool, {
  maxParallelism: 24,
});
