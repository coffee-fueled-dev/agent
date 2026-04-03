import { TerminalIcon } from "lucide-react";
import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import { type ToolPartProps, toolPartDetailBody } from "./types.js";

export function RunShellToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  const command =
    input &&
    typeof input === "object" &&
    input !== null &&
    "command" in input &&
    input.command != null
      ? String(input.command).trim()
      : "";

  return (
    <ToolPartLayout
      toolName={toolName}
      toolIcon={<TerminalIcon />}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {command !== "" ? (
        <>
          <span className="mb-2 block rounded-sm bg-muted/80 px-2 py-1.5 font-mono text-[10px] leading-snug">
            $ {command}
          </span>
          {toolPartDetailBody(part)}
        </>
      ) : (
        toolPartDetailBody(part)
      )}
    </ToolPartLayout>
  );
}
