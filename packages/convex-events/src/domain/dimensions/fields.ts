import { v } from "convex/values";

export const dimensionKindValidator = v.union(
  v.literal("eventType"),
  v.literal("streamType"),
);

export const dimensionFields = {
  namespace: v.string(),
  kind: dimensionKindValidator,
  value: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
};

export type DimensionKind = "eventType" | "streamType";
