import type { ReactNode } from "react";
import {
  MobileSidebarSheet,
  Sidebar,
  SidebarFooter,
  SidebarInset,
  SidebarMain,
  SidebarPanelControl,
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { AppSidebarAccountMenu } from "./app-sidebar-account-menu.js";
import {
  AppLayoutSidebarProvider,
  useAppLayoutSidebar,
} from "./app-layout-sidebar-context.js";
import { AppSidebarMobileNav, AppSidebarNav } from "./app-sidebar-nav.js";

function SidebarAccountFooter({
  current,
}: {
  current: "context" | "chat" | "events";
}) {
  const { isExpanded } = useSidebar();
  return (
    <SidebarFooter className={cn(!isExpanded && "items-center")}>
      <AppSidebarAccountMenu current={current} className="w-full" />
    </SidebarFooter>
  );
}

function MobileSidebarAccountFooter({
  current,
}: {
  current: "context" | "chat" | "events";
}) {
  const { closeMobile } = useSidebar();
  return (
    <AppSidebarAccountMenu
      current={current}
      onNavigate={closeMobile}
      forceExpanded
      className="w-full"
    />
  );
}

export function AppLayout({
  children,
  current,
  segmentLead,
  segmentTrail,
  rightSidebar,
}: {
  children: ReactNode;
  current: "context" | "chat" | "events";
  /** Left cluster after menu trigger (e.g. Back). */
  segmentLead?: ReactNode;
  /** Right-aligned inner segment nav (e.g. entry sub-tabs). */
  segmentTrail?: ReactNode;
  /** Optional right-side app panel content. */
  rightSidebar?: ReactNode;
}) {
  return (
    <AppLayoutSidebarProvider>
      <AppLayoutFrame
        current={current}
        segmentLead={segmentLead}
        segmentTrail={segmentTrail}
        rightSidebar={rightSidebar}
      >
        {children}
      </AppLayoutFrame>
    </AppLayoutSidebarProvider>
  );
}

function AppLayoutFrame({
  children,
  current,
  segmentLead,
  segmentTrail,
  rightSidebar,
}: {
  children: ReactNode;
  current: "context" | "chat" | "events";
  segmentLead?: ReactNode;
  segmentTrail?: ReactNode;
  rightSidebar?: ReactNode;
}) {
  const { innerSidebarVisible } = useAppLayoutSidebar();

  return (
    <SidebarProvider>
      <div className="grid h-dvh w-full grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)]">
        <aside className="hidden min-h-0 self-stretch md:flex md:min-h-dvh">
          <Sidebar>
            <SidebarMain>
              <AppSidebarNav current={current} />
            </SidebarMain>
            <SidebarAccountFooter current={current} />
          </Sidebar>
        </aside>
        <SidebarInset className="col-span-1 md:col-start-2">
          <header className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 md:px-4">
            <SidebarPanelControl />
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
          <main className="min-h-0">
            {rightSidebar && innerSidebarVisible ? (
              <div className="flex h-full min-h-0 flex-col gap-2 lg:flex-row">
                <div className="min-h-0 min-w-0 flex-1">{children}</div>
                <aside className="bg-muted/50 flex min-h-[10rem] shrink-0 flex-col p-6 lg:min-h-0 lg:w-72 fade-mask">
                  {rightSidebar}
                </aside>
              </div>
            ) : (
              children
            )}
          </main>
        </SidebarInset>
      </div>
      <MobileSidebarSheet
        footer={<MobileSidebarAccountFooter current={current} />}
      >
        <AppSidebarMobileNav current={current} />
      </MobileSidebarSheet>
    </SidebarProvider>
  );
}
