import type { InferUITools, Tool } from "ai";

// biome-ignore lint/suspicious/noEmptyInterface: augmented by tool modules
export interface RegisteredToolMap {}

export type RegisteredUITools = InferUITools<
  RegisteredToolMap & Record<string, Tool>
>;
