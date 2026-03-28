"use client";

import {
  BookOpenIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  MobileSidebarSheet,
  Sidebar,
  SidebarHeader,
  SidebarInset,
  SidebarMain,
  SidebarProvider,
  SidebarRailToggle,
  SidebarTrigger,
  useSidebar,
} from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function MobileNav({ current }: { current: "telemetry" | "context" | "chat" }) {
  const { closeMobile } = useSidebar();
  return (
    <SidebarNav current={current} onNavigate={closeMobile} forceExpanded />
  );
}

export function AppLayout({
  children,
  current,
  segmentLead,
  segmentTrail,
}: {
  children: ReactNode;
  current: "telemetry" | "context" | "chat";
  /** Left cluster after menu trigger (e.g. Back). */
  segmentLead?: ReactNode;
  /** Right-aligned inner segment nav (e.g. entry sub-tabs). */
  segmentTrail?: ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="grid min-h-dvh w-full grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)]">
        <aside className="hidden min-h-0 self-stretch border-sidebar-border md:flex md:min-h-dvh md:border-r">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2">
                <SidebarRailToggle />
              </div>
            </SidebarHeader>
            <SidebarMain>
              <SidebarNav current={current} />
            </SidebarMain>
          </Sidebar>
        </aside>
        <SidebarInset className="col-span-1 md:col-start-2">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 md:px-4">
            <SidebarTrigger />
            {segmentLead ? (
              <span className="flex shrink-0 items-center gap-2">
                {segmentLead}
              </span>
            ) : null}
            {segmentTrail ? (
              <>
                <div className="min-h-px min-w-0 flex-1" aria-hidden />
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {segmentTrail}
                </span>
              </>
            ) : null}
          </header>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-8">
            {children}
          </div>
        </SidebarInset>
      </div>
      <MobileSidebarSheet>
        <MobileNav current={current} />
      </MobileSidebarSheet>
    </SidebarProvider>
  );
}

/** `forceExpanded`: always show text links (e.g. mobile sheet when desktop rail is collapsed). */
function SidebarNav({
  current,
  onNavigate,
  className,
  forceExpanded,
}: {
  current: "telemetry" | "context" | "chat";
  onNavigate?: () => void;
  className?: string;
  forceExpanded?: boolean;
}) {
  const { isExpanded } = useSidebar();
  const showText = forceExpanded || isExpanded;
  const go = () => {
    onNavigate?.();
  };

  if (!showText) {
    return (
      <nav
        className={cn(
          "flex flex-col items-center gap-1 self-center",
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={current === "telemetry" ? "secondary" : "ghost"}
              size="icon"
              asChild
            >
              <a href="/" onClick={go} aria-label="Telemetry">
                <LayoutDashboardIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Telemetry</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={current === "context" ? "secondary" : "ghost"}
              size="icon"
              asChild
            >
              <a href="/context" onClick={go} aria-label="Context">
                <BookOpenIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Context</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={current === "chat" ? "secondary" : "ghost"}
              size="icon"
              asChild
            >
              <a href="/chat" onClick={go} aria-label="Chat">
                <MessageSquareIcon className="size-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Chat</TooltipContent>
        </Tooltip>
      </nav>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      <Button
        variant={current === "telemetry" ? "secondary" : "ghost"}
        className="w-full justify-start"
        asChild
      >
        <a href="/" onClick={go}>
          <LayoutDashboardIcon className="size-4" /> Telemetry
        </a>
      </Button>
      <Button
        variant={current === "context" ? "secondary" : "ghost"}
        className="w-full justify-start"
        asChild
      >
        <a href="/context" onClick={go}>
          <BookOpenIcon className="size-4" /> Context
        </a>
      </Button>
      <Button
        variant={current === "chat" ? "secondary" : "ghost"}
        className="w-full justify-start"
        asChild
      >
        <a href="/chat" onClick={go}>
          <MessageSquareIcon className="size-4" /> Chat
        </a>
      </Button>
    </nav>
  );
}
