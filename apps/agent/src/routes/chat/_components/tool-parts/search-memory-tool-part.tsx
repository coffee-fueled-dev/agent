import { SearchIcon } from "lucide-react";
import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import { type ToolPartProps, toolPartDetailBody } from "./types.js";

export function SearchMemoryToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  const query =
    input &&
    typeof input === "object" &&
    input !== null &&
    "query" in input &&
    input.query != null
      ? String(input.query).trim()
      : "";

  return (
    <ToolPartLayout
      toolName={toolName}
      toolIcon={<SearchIcon />}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {query !== "" ? (
        <>
          <span className="text-muted-foreground mb-2 block text-[10px] leading-snug">
            Query: {query}
          </span>
          {toolPartDetailBody(part)}
        </>
      ) : (
        toolPartDetailBody(part)
      )}
    </ToolPartLayout>
  );
}
