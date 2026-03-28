import { FileDropzone, FileDropzoneProvider } from "@/components/files";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { AppLayout } from "../../_components/app-layout.js";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import { ChatComposer } from "./chat-composer.js";
import { ChatMessageList } from "./chat-message-list.js";
import { SidebarInsetFill } from "@/components/layout/sidebar.js";

export function ChatBenchmarkPage() {
  const { threadId, token, hasToken, creating, initError, resetThread } =
    useChatThread();

  return (
    <AppLayout current="chat">
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
            Clear thread and retry
          </Button>
        </Empty>
      ) : creating || !threadId ? (
        <Empty className="min-h-[12rem]">
          <Spinner />
        </Empty>
      ) : (
        <PageSection>
          <PageSection.Header>
            <PageSection.HeaderRow>
              <PageSection.HeaderColumn className="flex-row items-center justify-start gap-2">
                <PageSection.Title size="lg">Thread</PageSection.Title>
                <PageSection.Description className="font-mono text-xs">
                  {threadId}
                </PageSection.Description>
              </PageSection.HeaderColumn>
              <PageSection.HeaderActions>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={resetThread}
                >
                  New thread
                </Button>
              </PageSection.HeaderActions>
            </PageSection.HeaderRow>
          </PageSection.Header>
          <PageSection.Content>
            <FileDropzoneProvider limit={10}>
              <FileDropzone className="flex flex-col gap-4 rounded-lg">
                <SidebarInsetFill>
                  <PageSection.Body className="flex flex-col p-2 h-full">
                    <div className="flex-1 overflow-auto">
                      <ChatMessageList threadId={threadId} />
                    </div>
                    <div className="flex-shrink-0">
                      <ChatComposer threadId={threadId} token={token} />
                    </div>
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
