"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import type * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

function DialogWithTabsHeader({
  children,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader {...props}>{children}</DialogHeader>;
}

function DialogWithTabsDescription({
  children,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription {...props}>{children}</DialogDescription>;
}

function DialogWithTabsTitle({
  children,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props}>{children}</DialogTitle>;
}

function DialogWithTabsFooter({
  children,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter {...props}>{children}</DialogFooter>;
}

function DialogWithTabsClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  return <DialogClose {...props}>{children}</DialogClose>;
}

function DialogWithTabsTrigger({
  children,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger asChild {...props}>
      <DialogTrigger asChild>{children}</DialogTrigger>
    </TabsTrigger>
  );
}

function DialogWithTabsTabsList({
  children,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return <TabsList {...props}>{children}</TabsList>;
}

function DialogWithTabsContentList({
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return <DialogContent {...props}>{children}</DialogContent>;
}

function DialogWithTabsContent({
  children,
  ...props
}: React.ComponentProps<typeof TabsContent>) {
  return <TabsContent {...props}>{children}</TabsContent>;
}

export function DialogWithTabs({
  children,
  defaultValue,
  onClick,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Tabs> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Tabs
      defaultValue={defaultValue}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...props}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </Tabs>
  );
}

DialogWithTabs.Header = DialogWithTabsHeader;
DialogWithTabs.Description = DialogWithTabsDescription;
DialogWithTabs.Title = DialogWithTabsTitle;
DialogWithTabs.Trigger = DialogWithTabsTrigger;
DialogWithTabs.TabsList = DialogWithTabsTabsList;
DialogWithTabs.ContentList = DialogWithTabsContentList;
DialogWithTabs.Content = DialogWithTabsContent;
DialogWithTabs.Footer = DialogWithTabsFooter;
DialogWithTabs.Close = DialogWithTabsClose;
