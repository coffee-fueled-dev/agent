import { ActivityIcon } from "lucide-react";
import { useMemo } from "react";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileDropzoneProvider } from "@/files";
import { renderApp } from "../../render-root.js";
import { AppLayout } from "../_components/app-layout.js";
import {
  AppLayoutSidebarProvider,
  useAppLayoutSidebar,
} from "../_components/app-layout-sidebar-context.js";
import { EventBusStreamFiltersDialog } from "../_components/event-bus-stream-filters-dialog.js";
import { EventBusStreamList } from "../_components/event-bus-stream-list.js";
import {
  EventBusStreamProvider,
  useEventBusStreamFilters,
} from "../_components/event-bus-stream-provider.js";
import { eventsFiltersToQueryArgs } from "../events/_hooks/use-events-filters-from-url.js";
import {
  ChatComposer,
  ChatComposerDropzone,
} from "./_components/chat-composer.js";
import { ChatComposerMemoryProvider } from "./_components/chat-composer-memory-provider.js";
import { ChatMessageList } from "./_components/chat-message-list.js";
import { HumanToolkitProvider } from "./_components/human-toolkit-provider.js";
import { ChatThreadProvider, useChatThread } from "./_hooks/use-chat-thread.js";

function ChatThreadEventBusPanel({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
}) {
  const { filters } = useEventBusStreamFilters();
  const filterArgs = useMemo(
    () =>
      eventsFiltersToQueryArgs({
        eventTypeId: filters.eventTypeId,
        sourceStreamTypeId: filters.sourceStreamTypeId,
        eventTimeMin: filters.eventTimeMin,
        eventTimeMax: filters.eventTimeMax,
      }),
    [filters],
  );
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 px-2 py-2">
      <div className="flex shrink-0 justify-end">
        <EventBusStreamFiltersDialog syncUrl={false} />
      </div>
      <div className="min-h-0 flex-1">
        <EventBusStreamList
          userId={userId}
          scope={{ kind: "thread", threadId }}
          filters={filterArgs}
          variant="sidebar"
          emptyTitle="No events for this thread yet."
        />
      </div>
    </div>
  );
}

export function ChatRoute() {
  return (
    <AppLayoutSidebarProvider>
      <ChatThreadProvider>
        <ChatRouteInner />
      </ChatThreadProvider>
    </AppLayoutSidebarProvider>
  );
}

function ChatRouteInner() {
  const { threadId, hasUserId, userId } = useChatThread();
  const { innerSidebarVisible, toggleInnerSidebarVisible } =
    useAppLayoutSidebar();

  return (
    <AppLayout
      segmentLead={
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide space-x-2">
          <b>Chat</b>
          <span className="font-thin">{threadId}</span>
        </span>
      }
      segmentTrail={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={toggleInnerSidebarVisible}
              aria-pressed={innerSidebarVisible}
            >
              <ActivityIcon />
              <span className="sr-only">
                {innerSidebarVisible ? "Hide side panel" : "Show side panel"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {innerSidebarVisible ? "Hide side panel" : "Show side panel"}
          </TooltipContent>
        </Tooltip>
      }
      rightSidebar={
        innerSidebarVisible ? (
          hasUserId && threadId && userId ? (
            <EventBusStreamProvider>
              <ChatThreadEventBusPanel threadId={threadId} userId={userId} />
            </EventBusStreamProvider>
          ) : (
            <Empty>
              <EmptyContent className="text-muted-foreground text-xs">
                <EmptyDescription>
                  {hasUserId && !threadId
                    ? "Open a thread to see observability events for it."
                    : "Set BUN_PUBLIC_ACCOUNT_TOKEN to load the event stream."}
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          )
        ) : null
      }
    >
      {!hasUserId ? (
        <Empty>
          <p className="text-muted-foreground text-sm">
            Set <code className="font-mono">BUN_PUBLIC_ACCOUNT_TOKEN</code> in
            your environment for this app build.
          </p>
        </Empty>
      ) : (
        <PageSection>
          <PageSection.Content className="px-8">
            <HumanToolkitProvider>
              <FileDropzoneProvider limit={10}>
                <ChatComposerMemoryProvider>
                  <SidebarInsetFill>
                    <PageSection.Body className="flex h-full min-h-0 flex-col gap-2">
                      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                          {threadId ? (
                            <ChatMessageList />
                          ) : (
                            <Empty>
                              <EmptyContent>
                                <EmptyDescription>
                                  No messages yet. Send a message to start a
                                  thread.
                                </EmptyDescription>
                              </EmptyContent>
                            </Empty>
                          )}
                        </div>
                        <div className="flex-shrink-0 pb-8">
                          <ChatComposerDropzone className="flex flex-col gap-4 rounded-lg">
                            <ChatComposer />
                          </ChatComposerDropzone>
                        </div>
                      </div>
                    </PageSection.Body>
                  </SidebarInsetFill>
                </ChatComposerMemoryProvider>
              </FileDropzoneProvider>
            </HumanToolkitProvider>
          </PageSection.Content>
        </PageSection>
      )}
    </AppLayout>
  );
}

renderApp(<ChatRoute />);
