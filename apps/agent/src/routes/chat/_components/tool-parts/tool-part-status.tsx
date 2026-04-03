import { CheckIcon, CircleXIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { ToolOrDynamicPart } from "./types.js";

export function toolPartStateIcon(part: ToolOrDynamicPart) {
  if (part.state === "output-available") {
    return <CheckIcon />;
  }
  if (part.state === "output-error") {
    return <CircleXIcon />;
  }
  return <Spinner />;
}

export function toolPartStatusLabel(part: ToolOrDynamicPart): string {
  if (part.state === "output-available") {
    return "Tool result";
  }
  if (part.state === "output-error") {
    return "Tool error";
  }
  return "Tool call";
}
