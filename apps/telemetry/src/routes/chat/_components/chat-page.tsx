import { ActivityIcon } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { FileDropzone, FileDropzoneProvider } from "@/components/files";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppLayout } from "../../_components/app-layout.js";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import { ChatComposer } from "./chat-composer.js";
import { ChatMessageList } from "./chat-message-list.js";
import { ChatThreadEventsList } from "./chat-thread-events-list.js";

const EVENTS_SIDEBAR_STORAGE_KEY = "telemetry_chat_events_sidebar_visible";

export function ChatBenchmarkPage() {
  const { threadId, token, hasToken, setThreadId } = useChatThread();
  const [eventsSidebarVisible, setEventsSidebarVisible] = useLocalStorage(
    EVENTS_SIDEBAR_STORAGE_KEY,
    false,
  );

  return (
    <AppLayout
      current="chat"
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
              onClick={() => setEventsSidebarVisible((v) => !v)}
              aria-pressed={eventsSidebarVisible}
            >
              <ActivityIcon className="size-4" />
              <span className="sr-only">
                {eventsSidebarVisible
                  ? "Hide telemetry event stream"
                  : "Show telemetry event stream"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {eventsSidebarVisible
              ? "Hide telemetry event stream"
              : "Show telemetry event stream"}
          </TooltipContent>
        </Tooltip>
      }
    >
      {!hasToken ? (
        <Empty>
          <p className="text-muted-foreground text-sm">
            Set <code className="font-mono">BUN_PUBLIC_ACCOUNT_TOKEN</code> in
            your environment for this app build.
          </p>
        </Empty>
      ) : (
        <PageSection>
          <PageSection.Content>
            <FileDropzoneProvider limit={10}>
              <FileDropzone className="flex flex-col gap-4 rounded-lg">
                <SidebarInsetFill>
                  <PageSection.Body
                    className={
                      eventsSidebarVisible
                        ? "flex h-full min-h-0 flex-col gap-2 p-2 lg:flex-row"
                        : "flex h-full min-h-0 flex-col gap-2 p-2"
                    }
                  >
                    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {threadId ? (
                          <ChatMessageList threadId={threadId} />
                        ) : (
                          <div className="text-muted-foreground flex min-h-[8rem] items-center justify-center text-sm">
                            No messages yet. Send a message to start a thread.
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <ChatComposer
                          threadId={threadId}
                          token={token}
                          setThreadId={setThreadId}
                        />
                      </div>
                    </div>
                    {eventsSidebarVisible ? (
                      <aside className="border-border flex min-h-[10rem] shrink-0 flex-col border-t pt-2 lg:min-h-0 lg:w-72 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3">
                        {threadId ? (
                          <ChatThreadEventsList threadId={threadId} />
                        ) : (
                          <Empty>
                            <EmptyContent className="text-muted-foreground text-xs">
                              <EmptyDescription>
                                Event stream appears after you start a thread.
                              </EmptyDescription>
                            </EmptyContent>
                          </Empty>
                        )}
                      </aside>
                    ) : null}
                  </PageSection.Body>
                </SidebarInsetFill>
              </FileDropzone>
            </FileDropzoneProvider>
          </PageSection.Content>
        </PageSection>
      )}
    </AppLayout>
  );
}
