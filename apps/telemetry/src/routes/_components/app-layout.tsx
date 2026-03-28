import type { ReactNode } from "react";
import {
  MobileSidebarSheet,
  Sidebar,
  SidebarInset,
  SidebarMain,
  SidebarPanelControl,
  SidebarProvider,
} from "@/components/layout/sidebar";
import { AppSidebarMobileNav, AppSidebarNav } from "./app-sidebar-nav";

export function AppLayout({
  children,
  current,
  segmentLead,
  segmentTrail,
}: {
  children: ReactNode;
  current: "context" | "chat" | "events";
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
            <SidebarMain>
              <AppSidebarNav current={current} />
            </SidebarMain>
          </Sidebar>
        </aside>
        <SidebarInset className="col-span-1 md:col-start-2">
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 md:px-4">
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-8">
            {children}
          </div>
        </SidebarInset>
      </div>
      <MobileSidebarSheet>
        <AppSidebarMobileNav current={current} />
      </MobileSidebarSheet>
    </SidebarProvider>
  );
}
