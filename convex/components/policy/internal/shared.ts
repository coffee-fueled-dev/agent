import { v } from "convex/values";

export const metadataValidator = v.optional(
  v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
);

export const scopeValidator = v.object({
  scopeType: v.string(),
  scopeId: v.string(),
});

export const lastUpdateActorValidator = v.object({
  byType: v.string(),
  byId: v.string(),
  reason: v.optional(v.string()),
  source: v.optional(v.string()),
});

export const lastUpdateValidator = v.object({
  time: v.number(),
  byType: v.string(),
  byId: v.string(),
  reason: v.optional(v.string()),
  source: v.optional(v.string()),
});

export function buildLastUpdate(actor?: {
  byType: string;
  byId: string;
  reason?: string;
  source?: string;
}) {
  return {
    time: Date.now(),
    byType: actor?.byType ?? "system",
    byId: actor?.byId ?? "system",
    reason: actor?.reason,
    source: actor?.source,
  };
}
