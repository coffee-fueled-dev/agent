import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import {
  type ToolPartProps,
  toolPartDetailBody,
  toolPartGoalFromInput,
} from "./types.js";

export function ShareMemoriesToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  let seen: string[] = [];
  let selected: string[] = [];
  if (input && typeof input === "object" && input !== null) {
    if (
      "seenMemoryRecordIds" in input &&
      Array.isArray(input.seenMemoryRecordIds)
    ) {
      seen = input.seenMemoryRecordIds as string[];
    }
    if (
      "selectedMemoryRecordIds" in input &&
      Array.isArray(input.selectedMemoryRecordIds)
    ) {
      selected = input.selectedMemoryRecordIds as string[];
    }
  }

  return (
    <ToolPartLayout
      toolName={toolName}
      goal={toolPartGoalFromInput(input)}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      <span className="text-muted-foreground mb-2 block text-[10px] leading-snug">
        Seen: {seen.length}
        {seen.length > 0
          ? ` (${seen.slice(0, 2).join(", ")}${seen.length > 2 ? "…" : ""})`
          : ""}
        {" · "}
        Shared: {selected.length}
        {selected.length > 0
          ? ` (${selected.slice(0, 2).join(", ")}${selected.length > 2 ? "…" : ""})`
          : ""}
      </span>
      {toolPartDetailBody(part)}
    </ToolPartLayout>
  );
}
