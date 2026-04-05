import { v } from "convex/values";

export const chunkValidator = v.object({
  text: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
});
