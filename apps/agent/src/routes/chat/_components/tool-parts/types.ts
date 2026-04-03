import type { UIMessage, UITools } from "@very-coffee/backend/types";
import type { ToolUIPart } from "ai";

export type ToolUIPartForApp = ToolUIPart<UITools>;

export type ToolOrDynamicPart =
  | ToolUIPartForApp
  | Extract<UIMessage["parts"][number], { type: "dynamic-tool" }>;

export type ToolPartProps = {
  part: ToolOrDynamicPart;
  toolName: string;
};

export function formatToolPayload(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Default payload block for the collapsible body. */
export function toolPartDetailBody(part: ToolOrDynamicPart): string {
  switch (part.state) {
    case "input-streaming":
      return formatToolPayload(part.input ?? {});
    case "input-available":
      return formatToolPayload(part.input);
    case "output-available":
      return formatToolPayload(part.output ?? part.input);
    case "output-error":
      return [part.errorText, formatToolPayload(part.input)]
        .filter((s) => s !== "")
        .join("\n\n");
    default:
      return "";
  }
}
