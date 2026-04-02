import { getToolName, isToolUIPart } from "ai";
import { Badge } from "@/components/ui/badge.js";
import { Item, ItemContent, ItemDescription } from "@/components/ui/item.js";
import type { UIMessage } from "../../../../../../packages/backend/convex/agents/_tools/uiMessage.js";

type MessagePart = UIMessage["parts"][number];

/** Shared UI for `dynamic-tool` and all `tool-*` parts from `isToolUIPart`. */
export function ChatMessagePartTool({ part }: { part: MessagePart }) {
  if (part.type !== "dynamic-tool" && !isToolUIPart(part)) return null;

  const toolName =
    part.type === "dynamic-tool" ? part.toolName : getToolName(part);
  const label =
    part.state === "output-available"
      ? "Tool result"
      : part.state === "output-error"
        ? "Tool error"
        : "Tool call";

  return (
    <Item size="sm" variant="outline">
      <ItemContent className="min-w-0 gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px]">
            {toolName}
          </Badge>
          <span className="text-muted-foreground text-xs">{label}</span>
        </span>
        <ItemDescription className="break-all font-mono text-[11px]">
          {part.state === "input-streaming" || part.state === "input-available"
            ? JSON.stringify(part.input ?? {})
            : part.state === "output-available"
              ? JSON.stringify(part.output)
              : part.errorText}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}
