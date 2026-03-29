import type { InferUITools, Tool } from "ai";

/**
 * Merged via `declare module` in each tool module (see `registeredToolAugments.ts`).
 * Keeps UI tool typings in one logical map without importing every tool into `index.ts`.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmented by tool modules
export interface RegisteredToolMap {}

/** `Record<string, Tool>` satisfies `ToolSet`'s index signature for `InferUITools`. */
export type RegisteredUITools = InferUITools<
  RegisteredToolMap & Record<string, Tool>
>;
