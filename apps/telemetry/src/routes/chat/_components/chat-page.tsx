import { RefreshCcwIcon } from "lucide-react";
import { FileDropzone, FileDropzoneProvider } from "@/components/files";
import { PageSection } from "@/components/layout/page-section";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { AppLayout } from "../../_components/app-layout.js";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import { ChatComposer } from "./chat-composer.js";
import { ChatMessageList } from "./chat-message-list.js";
import { ChatThreadEventsList } from "./chat-thread-events-list.js";

export function ChatBenchmarkPage() {
  const { threadId, token, hasToken, creating, initError, resetThread } =
    useChatThread();

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={resetThread}
        >
          <RefreshCcwIcon className="size-3.5" /> Reset chat
        </Button>
      }
    >
      {!hasToken ? (
        <Empty>
          <p className="text-muted-foreground text-sm">
            Set <code className="font-mono">BUN_PUBLIC_ACCOUNT_TOKEN</code> in
            your environment for this app build.
          </p>
        </Empty>
      ) : initError ? (
        <Empty>
          <p className="text-destructive text-sm">{initError}</p>
          <Button type="button" variant="outline" onClick={resetThread}>
            Reset chat
          </Button>
        </Empty>
      ) : creating || !threadId ? (
        <Empty className="min-h-[12rem]">
          <Spinner />
        </Empty>
      ) : (
        <PageSection>
          <PageSection.Content>
            <FileDropzoneProvider limit={10}>
              <FileDropzone className="flex flex-col gap-4 rounded-lg">
                <SidebarInsetFill>
                  <PageSection.Body className="flex h-full min-h-0 flex-col gap-2 p-2 lg:flex-row">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                      <div className="min-h-0 flex-1 overflow-auto">
                        <ChatMessageList threadId={threadId} />
                      </div>
                      <div className="flex-shrink-0">
                        <ChatComposer threadId={threadId} token={token} />
                      </div>
                    </div>
                    <aside className="border-border flex min-h-[10rem] shrink-0 flex-col border-t pt-2 lg:min-h-0 lg:w-72 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3">
                      <ChatThreadEventsList threadId={threadId} />
                    </aside>
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
