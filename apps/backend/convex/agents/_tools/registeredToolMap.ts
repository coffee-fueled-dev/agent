import type { InferUITools, Tool } from "ai";

// biome-ignore lint/suspicious/noEmptyInterface: augmented by tool modules
export interface RegisteredToolMap {}

/** Satisfies `ToolSet` for `InferUITools`; `Record<string, Tool>` is not re-exported so keys stay literal. */
type RegisteredToolMapForInfer = RegisteredToolMap & Record<string, Tool>;

type RegisteredUIToolsAll = InferUITools<RegisteredToolMapForInfer>;

export type RegisteredUITools = Pick<
  RegisteredUIToolsAll,
  keyof RegisteredToolMap & string
>;

export type RegisteredToolName = keyof RegisteredUITools;
