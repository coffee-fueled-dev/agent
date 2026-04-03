import { v } from "convex/values";

const propertyHitValidator = v.object({
  propKey: v.string(),
  text: v.string(),
});

/** Lexical hit: canonical row plus all matching text slices (for RRF / display). */
export const lexicalSearchHitValidator = v.object({
  /** `searchItems` row id (string so hits compose across Convex components). */
  _id: v.string(),
  _creationTime: v.number(),
  namespace: v.string(),
  sourceSystem: v.string(),
  sourceRef: v.string(),
  updatedAt: v.number(),
  bucketId: v.optional(v.string()),
  bucketType: v.optional(v.string()),
  supersededAt: v.optional(v.number()),
  sourceVersion: v.optional(v.number()),
  propertyHits: v.array(propertyHitValidator),
});
