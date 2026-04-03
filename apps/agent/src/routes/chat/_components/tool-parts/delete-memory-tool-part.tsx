import { Trash2Icon } from "lucide-react";
import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import { type ToolPartProps, toolPartDetailBody } from "./types.js";

export function DeleteMemoryToolPart({ part, toolName }: ToolPartProps) {
  return (
    <ToolPartLayout
      toolName={toolName}
      toolIcon={<Trash2Icon />}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {toolPartDetailBody(part)}
    </ToolPartLayout>
  );
}
