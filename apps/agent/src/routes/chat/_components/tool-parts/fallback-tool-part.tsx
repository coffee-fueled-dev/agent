import { WrenchIcon } from "lucide-react";
import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import { type ToolPartProps, toolPartDetailBody } from "./types.js";

/** Unregistered tool names (e.g. dynamic tools) use a neutral shell. */
export function FallbackToolPart({ part, toolName }: ToolPartProps) {
  return (
    <ToolPartLayout
      toolName={toolName}
      toolIcon={<WrenchIcon />}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {toolPartDetailBody(part)}
    </ToolPartLayout>
  );
}
