import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import type * as React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

function SheetWithTabsHeader({
  children,
  ...props
}: React.ComponentProps<typeof SheetHeader>) {
  return <SheetHeader {...props}>{children}</SheetHeader>;
}

function SheetWithTabsDescription({
  children,
  ...props
}: React.ComponentProps<typeof SheetDescription>) {
  return <SheetDescription {...props}>{children}</SheetDescription>;
}

function SheetWithTabsTitle({
  children,
  ...props
}: React.ComponentProps<typeof SheetTitle>) {
  return <SheetTitle {...props}>{children}</SheetTitle>;
}

function SheetWithTabsFooter({
  children,
  ...props
}: React.ComponentProps<typeof SheetFooter>) {
  return <SheetFooter {...props}>{children}</SheetFooter>;
}

function SheetWithTabsClose({
  children,
  ...props
}: React.ComponentProps<typeof SheetClose>) {
  return <SheetClose {...props}>{children}</SheetClose>;
}

function SheetWithTabsTrigger({
  children,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger asChild {...props}>
      <SheetTrigger asChild>{children}</SheetTrigger>
    </TabsTrigger>
  );
}

function SheetWithTabsTabTrigger({
  children,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return <TabsTrigger {...props}>{children}</TabsTrigger>;
}

function SheetWithTabsTabsList({
  children,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return <TabsList {...props}>{children}</TabsList>;
}

function SheetWithTabsContentList({
  children,
  ...props
}: React.ComponentProps<typeof SheetContent>) {
  return <SheetContent {...props}>{children}</SheetContent>;
}

function SheetWithTabsContent({
  children,
  ...props
}: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent {...props}>{children}</TabsContent>;
}

const SheetWithTabsRoot = ({
  children,
  defaultValue,
  onClick,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Tabs> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return (
    <Tabs
      defaultValue={defaultValue}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...props}
    >
      <Sheet open={open} onOpenChange={onOpenChange}>
        {children}
      </Sheet>
    </Tabs>
  );
};

export const SheetWithTabs = Object.assign(SheetWithTabsRoot, {
  Header: SheetWithTabsHeader,
  Description: SheetWithTabsDescription,
  Title: SheetWithTabsTitle,
  Trigger: SheetWithTabsTrigger,
  TabTrigger: SheetWithTabsTabTrigger,
  TabsList: SheetWithTabsTabsList,
  ContentList: SheetWithTabsContentList,
  Content: SheetWithTabsContent,
  Footer: SheetWithTabsFooter,
  Close: SheetWithTabsClose,
});
