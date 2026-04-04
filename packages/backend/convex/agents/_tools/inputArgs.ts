import { z } from "zod/v4";

const goalSchema = z
  .string()
  .min(1)
  .describe(
    "Five or less words about what this tool invocation is trying to accomplish (prioritization, audit, and UI context).",
  );

/**
 * Composes tool-specific fields with a required `goal` in one object schema (type-safe merge).
 */
export function inputArgs<const T extends z.ZodRawShape>(specific: T) {
  return z.object({
    goal: goalSchema,
    ...specific,
  });
}
