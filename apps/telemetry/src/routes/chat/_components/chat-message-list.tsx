import { api } from "@backend/api.js";
import type { UIMessage } from "@backend/llms/uiMessage.js";
import { useUIMessages } from "@convex-dev/agent/react";
import { useSessionIdArg } from "convex-helpers/react/sessions";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { ListSection } from "@/components/layout/list-section";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ChatMessagePart } from "./chat-message-part.js";

const PAGE_SIZE = 15;

export function ChatMessageList({ threadId }: { threadId: string }) {
  const paginated = useUIMessages(
    api.chat.threads.listThreadMessages,
    useSessionIdArg({ threadId }),
    { initialNumItems: PAGE_SIZE, stream: true },
  );

  if (!paginated) {
    return (
      <Empty className="min-h-[12rem]">
        <Spinner />
      </Empty>
    );
  }

  const { results, status, loadMore, isLoading } = paginated;
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <FadeOverflow className="h-full">
      <ListSection
        list={results}
        loading={isLoading}
        className="gap-3 w-full max-w-240 mx-auto"
      >
        <ListSection.Loading />
        <ListSection.Empty>
          <span className="text-muted-foreground text-sm">
            No messages yet. Send a prompt below.
          </span>
        </ListSection.Empty>
        {(row) => <ChatMessageBubble key={row.id} message={row as UIMessage} />}
      </ListSection>
      <LoadMoreSentinel
        onLoadMore={() => loadMore(PAGE_SIZE)}
        canLoadMore={canLoadMore}
        isLoadingMore={isLoadingMore}
        scrollContainerSelector='[data-slot="scroll-area-viewport"]'
      />
    </FadeOverflow>
  );
}

function ChatMessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm ${
        isUser
          ? "border-primary/30 bg-primary/5 max-w-lg self-end"
          : "border-border bg-card"
      }`}
    >
      <div className="text-muted-foreground text-[10px] font-medium uppercase">
        {message.role}
      </div>
      <div className="flex flex-col gap-2">
        {message.parts.map((part, i) => (
          <ChatMessagePart
            // biome-ignore lint/suspicious/noArrayIndexKey: UIMessage parts have no stable id
            key={`${message.id}-${i}-${part.type}`}
            part={part}
            role={message.role}
            messageStatus={message.status}
          />
        ))}
      </div>
    </div>
  );
}
