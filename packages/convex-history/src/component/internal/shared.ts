import { v } from "convex/values";

export const streamRefFields = {
  streamType: v.string(),
  streamId: v.string(),
} as const;

export const entryRefFields = {
  ...streamRefFields,
  entryId: v.string(),
} as const;

export const metadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export const metadataValidator = v.optional(
  v.record(v.string(), metadataValueValidator),
);

export const streamRefValidator = v.object(streamRefFields);

export const entryRefValidator = v.object(entryRefFields);

export const historyEntryValidator = v.object({
  streamType: v.string(),
  streamId: v.string(),
  entryId: v.string(),
  kind: v.string(),
  payload: v.optional(v.any()),
  parentEntryIds: v.array(v.string()),
  entryTime: v.number(),
  attrs: metadataValidator,
});

export const historyHeadValidator = v.object({
  streamType: v.string(),
  streamId: v.string(),
  entryId: v.string(),
  headKind: v.optional(v.string()),
});

export function stripSystemFields<T extends Record<string, unknown>>(
  doc: T,
): Omit<T, "_id" | "_creationTime"> {
  const { _id, _creationTime, ...rest } = doc;
  return rest as Omit<T, "_id" | "_creationTime">;
}

export function normalizeParentEntryIds(parentEntryIds?: string[]) {
  const normalized = parentEntryIds ?? [];
  const seen = new Set<string>();

  for (const parentEntryId of normalized) {
    if (seen.has(parentEntryId)) {
      throw new Error(
        `Duplicate parent entry "${parentEntryId}" is not allowed`,
      );
    }
    seen.add(parentEntryId);
  }

  return normalized;
}
