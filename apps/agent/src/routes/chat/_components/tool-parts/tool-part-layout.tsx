import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ItemContent } from "@/components/ui/item.js";
import { cn } from "@/lib/utils";

export function ToolPartLayout({
  toolName,
  goal,
  stateIcon,
  statusLabel,
  children,
}: {
  toolName: string;
  /** From tool input; shown on the summary line after the name badge. */
  goal?: string | undefined;
  stateIcon: React.ReactNode;
  statusLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const badgeLabel = open
    ? toolName
    : toolName.slice(0, 1).toUpperCase() || "?";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "group/item flex flex-col overflow-hidden rounded-md border border-border text-sm transition-colors duration-100",
          "outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-start gap-2.5 px-4 py-3 text-left",
            "hover:bg-muted/50 [&[data-state=open]_.chevron]:rotate-90",
          )}
        >
          <ItemContent className="min-w-0 flex-1 gap-1">
            <span className="flex w-full min-w-0 items-start gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 font-mono text-[10px]",
                  !open && "min-w-7 justify-center",
                  open && "max-w-full whitespace-normal break-all text-left",
                )}
              >
                {badgeLabel}
              </Badge>
              {goal ? (
                <span className="text-muted-foreground min-w-0 flex-1 truncate pt-0.5 text-xs leading-snug">
                  {goal}
                </span>
              ) : null}
              <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center pt-0.5 [&_svg]:size-3.5">
                {stateIcon}
              </span>
              <ChevronRightIcon className="chevron text-muted-foreground ml-auto size-4 shrink-0 pt-0.5 transition-transform" />
            </span>
          </ItemContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border space-y-2 border-t px-4 pb-3 pt-2">
            <div className="text-muted-foreground text-xs">{statusLabel}</div>
            <pre className="bg-muted/50 text-muted-foreground break-all rounded-md p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {children}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
