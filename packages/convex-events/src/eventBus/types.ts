import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { EventBusEntryDoc, ExpectedDataModel } from "./models/types";

export type BusEntry = EventBusEntryDoc;

/** Host-schema mutation ctx: FIFO bus + dimensions tables. */
export type EventsBusMutationCtx = GenericMutationCtx<ExpectedDataModel>;

/** Host-schema query ctx for bus reads (`listEntries`, `listDimensions`). */
export type EventsBusQueryCtx = GenericQueryCtx<ExpectedDataModel>;
