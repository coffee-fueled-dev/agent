import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import {
  type ToolPartProps,
  toolPartDetailBody,
  toolPartGoalFromInput,
} from "./types.js";

export function BrowseWebToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  let instruction = "";
  let startUrl = "";
  if (input && typeof input === "object" && input !== null) {
    if ("instruction" in input && input.instruction != null) {
      instruction = String(input.instruction).trim();
    }
    if ("startUrl" in input && input.startUrl != null) {
      startUrl = String(input.startUrl).trim();
    }
  }

  return (
    <ToolPartLayout
      toolName={toolName}
      goal={toolPartGoalFromInput(input)}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {startUrl !== "" || instruction !== "" ? (
        <>
          {startUrl !== "" ? (
            <span className="text-muted-foreground mb-1 block text-[10px] leading-snug break-all">
              Start: {startUrl}
            </span>
          ) : null}
          {instruction !== "" ? (
            <span className="text-muted-foreground mb-2 block text-[10px] leading-snug">
              {instruction}
            </span>
          ) : null}
          {toolPartDetailBody(part)}
        </>
      ) : (
        toolPartDetailBody(part)
      )}
    </ToolPartLayout>
  );
}
