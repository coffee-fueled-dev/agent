import type { Composable } from "../../llms/tools/_libs/toolkit";
import { toolkit } from "../../llms/tools/_libs/toolkit";
import chatInstructions from "../_instructions";
import { authoringToolkit } from "./contextAuthoring";
import { listContextTool } from "./contextBrowse";
import { searchContextTool } from "./contextSearch";

/**
 * Context tools for the chat agent. Namespace is fixed at build time (thread owner);
 * the model cannot pass a different namespace.
 */
export function contextToolkit(namespace: string): Composable {
  return toolkit(
    [
      searchContextTool(namespace),
      authoringToolkit(namespace),
      listContextTool(namespace),
    ],
    {
      name: "context",
      instructions: [chatInstructions],
    },
  );
}

/** Placeholder namespace for static tool registry / UI message typing only. */
export function contextToolkitForRegistry(): Composable {
  return contextToolkit("__placeholder__");
}
