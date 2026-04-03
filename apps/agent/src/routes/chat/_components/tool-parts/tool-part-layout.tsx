import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";
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
  stateIcon,
  statusLabel,
  children,
}: {
  toolName: string;
  stateIcon: React.ReactNode;
  statusLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
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
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {toolName}
              </Badge>
              <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
                {stateIcon}
              </span>
              <span className="text-muted-foreground text-xs">
                {statusLabel}
              </span>
              <ChevronRightIcon className="chevron text-muted-foreground ml-auto size-4 shrink-0 transition-transform" />
            </span>
          </ItemContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-border border-t px-4 pb-3 pt-2">
            <pre className="p-3 bg-muted/50 text-muted-foreground break-all font-mono text-xs leading-relaxed whitespace-pre-wrap rounded-md">
              {children}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
