import { ToolPartLayout } from "./tool-part-layout.js";
import { toolPartStateIcon, toolPartStatusLabel } from "./tool-part-status.js";
import {
  type ToolPartProps,
  toolPartDetailBody,
  toolPartGoalFromInput,
} from "./types.js";

export function QueryUrlToolPart({ part, toolName }: ToolPartProps) {
  const input = "input" in part ? part.input : undefined;
  const query =
    input &&
    typeof input === "object" &&
    input !== null &&
    "query" in input &&
    input.query != null
      ? String(input.query).trim()
      : "";
  const url =
    input &&
    typeof input === "object" &&
    input !== null &&
    "url" in input &&
    input.url != null
      ? String(input.url).trim()
      : "";

  return (
    <ToolPartLayout
      toolName={toolName}
      goal={toolPartGoalFromInput(input)}
      stateIcon={toolPartStateIcon(part)}
      statusLabel={toolPartStatusLabel(part)}
    >
      {query !== "" ? (
        <>
          <span className="text-muted-foreground mb-2 block text-[10px] leading-snug">
            Query: {query}
            {url !== "" ? (
              <>
                <br />
                URL: {url}
              </>
            ) : null}
          </span>
          {toolPartDetailBody(part)}
        </>
      ) : (
        toolPartDetailBody(part)
      )}
    </ToolPartLayout>
  );
}
