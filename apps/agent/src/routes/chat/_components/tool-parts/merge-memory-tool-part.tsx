import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import {
  type ToolPartProps,
  toolPartDetailBody,
  toolPartGoalFromInput,
} from "./types.js";

export function MergeMemoryToolPart({ part, toolName }: ToolPartProps) {
  return (
    <ToolPartLayout
      toolName={toolName}
      goal={toolPartGoalFromInput("input" in part ? part.input : undefined)}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {toolPartDetailBody(part)}
    </ToolPartLayout>
  );
}
