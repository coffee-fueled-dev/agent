import type { UIMessage, UITools } from "@agent/backend/types";
import { getToolName, isToolUIPart } from "ai";
import { ToolPartView } from "./tool-parts/index.js";

type MessagePart = UIMessage["parts"][number];

/** Shared UI for `dynamic-tool` and all `tool-*` parts from `isToolUIPart`. */
export function ChatMessagePartTool({ part }: { part: MessagePart }) {
  if (part.type !== "dynamic-tool" && !isToolUIPart(part)) return null;

  const toolName =
    part.type === "dynamic-tool" ? part.toolName : getToolName<UITools>(part);

  return <ToolPartView part={part} toolName={toolName} />;
}
