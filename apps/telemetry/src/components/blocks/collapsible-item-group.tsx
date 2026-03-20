import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ItemGroup } from "../ui/item";

interface CollapsibleItemGroupProps
  extends Omit<
    React.ComponentProps<typeof Collapsible>,
    "open" | "onOpenChange"
  > {
  itemCount?: number | `> ${number}` | `${number} ${string}`;
}

export function CollapsibleItemGroup({
  children,
  itemCount,
  defaultOpen,
  className,
  ...props
}: CollapsibleItemGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  let title: React.ReactNode;
  let actions: React.ReactNode;
  let content: React.ReactNode;
  const otherChildren: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    else if (child.type === CollapsibleItemGroup.Title) title = child;
    else if (child.type === CollapsibleItemGroup.Actions) actions = child;
    else if (child.type === CollapsibleItemGroup.Content) content = child;
    else otherChildren.push(child);
  });

  return (
    <Collapsible
      className={cn("flex flex-col gap-2", className)}
      open={open}
      onOpenChange={setOpen}
      {...props}
    >
      <span className="flex flex-shrink-0 items-center justify-between">
        <span className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost">
              {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
              <b>{title}</b>
            </Button>
          </CollapsibleTrigger>
          {itemCount && !open && <Badge variant="outline">{itemCount}</Badge>}
        </span>
        {actions}
      </span>
      {otherChildren}
      {content}
    </Collapsible>
  );
}

CollapsibleItemGroup.Content = function CollapsibleItemGroupContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn("flex flex-col flex-1 min-h-0 overflow-hidden", className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
};
CollapsibleItemGroup.ItemGroup = function CollapsibleItemGroupItemGroup({
  className,
  ...props
}: React.ComponentProps<typeof ItemGroup>) {
  return <ItemGroup className={cn("flex-1", className)} {...props} />;
};
CollapsibleItemGroup.Title = ({ children }: { children: string }) => children;
CollapsibleItemGroup.Actions = ({ children }: React.PropsWithChildren) =>
  children;
