import { BookPlusIcon } from "lucide-react";
import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import { type ToolPartProps, toolPartDetailBody } from "./types.js";

export function AddMemoryToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  let headline = "";
  if (input && typeof input === "object" && input !== null) {
    const title =
      "title" in input && input.title != null ? String(input.title).trim() : "";
    const text =
      "text" in input && input.text != null ? String(input.text).trim() : "";
    headline = [title, text.slice(0, 100)].filter(Boolean).join(" — ");
  }

  return (
    <ToolPartLayout
      toolName={toolName}
      toolIcon={<BookPlusIcon />}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {headline !== "" ? (
        <>
          <span className="text-muted-foreground mb-2 block text-[10px] leading-snug">
            {headline}
            {headline.length >= 100 ? "…" : ""}
          </span>
          {toolPartDetailBody(part)}
        </>
      ) : (
        toolPartDetailBody(part)
      )}
    </ToolPartLayout>
  );
}
