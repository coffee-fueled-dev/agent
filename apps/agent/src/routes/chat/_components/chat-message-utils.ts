import type { UIMessage } from "@very-coffee/backend/types";
import { isToolUIPart } from "ai";

export function findLastUserMessageIndex(messages: UIMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user") {
      return i;
    }
  }
  return -1;
}

/** True once the assistant has something visible (text, tool UI, file, etc.). */
export function hasRenderableAssistantContent(message: UIMessage): boolean {
  if (message.role !== "assistant") return false;
  for (const part of message.parts) {
    switch (part.type) {
      case "text":
        if (part.text.trim().length > 0) return true;
        break;
      case "reasoning":
        if ("text" in part && part.text?.trim()) return true;
        break;
      case "file":
        return true;
      case "source-url":
      case "source-document":
        return true;
      case "dynamic-tool":
        return true;
      case "step-start":
        break;
      default:
        if (isToolUIPart(part)) return true;
        if (part.type.startsWith("data-")) return true;
    }
  }
  return false;
}
