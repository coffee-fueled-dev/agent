import { api } from "@agent/backend/api";
import type { UIMessage } from "@agent/backend/types";
import { useUIMessages } from "@convex-dev/agent/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useChatThread } from "../_hooks/use-chat-thread.js";
import { ChatAssistantLoadingBubble } from "./chat-assistant-loading-bubble.js";
import {
  ChatJumpToLatestProvider,
  JumpToLatest,
  LastMessagePair,
} from "./chat-jump-to-latest-provider.js";
import { ChatMessageBubble } from "./chat-message-bubble.js";
import { estimateChatMessageTextMinHeight } from "./chat-message-pretext.js";
import {
  findLastUserMessageIndex,
  hasRenderableAssistantContent,
} from "./chat-message-utils.js";

const PAGE_SIZE = 15;

function ChatMessageListItem({
  message,
  namespace,
}: {
  message: UIMessage;
  namespace: string | undefined;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const minHeight = useMemo(
    () => estimateChatMessageTextMinHeight(message, width),
    [message, width],
  );

  return (
    <div
      ref={wrapRef}
      className="flex w-full flex-col"
      style={minHeight > 0 ? { minHeight } : undefined}
    >
      <ChatMessageBubble message={message} namespace={namespace} />
    </div>
  );
}

export function ChatMessageList() {
  const {
    threadId,
    userId,
    awaitingAssistantStream,
    setAwaitingAssistantStream,
  } = useChatThread();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight);
    });
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => {
      ro.disconnect();
    };
  }, []);

  const activeThreadId = threadId as string;

  const paginated = useUIMessages(
    api.chat.thread.listThreadMessages,
    { threadId: activeThreadId },
    {
      initialNumItems: PAGE_SIZE,
      stream: true,
    },
  );

  const results =
    paginated?.results.filter((message) => message.role !== "system") ?? [];

  const lastUserIdx = findLastUserMessageIndex(results);
  const hasActiveUserTurn = lastUserIdx >= 0;

  const messagesBefore = hasActiveUserTurn
    ? results.slice(0, lastUserIdx)
    : results.length >= 2
      ? results.slice(0, -2)
      : [];

  const turnTail = hasActiveUserTurn
    ? results.slice(lastUserIdx)
    : results.length >= 2
      ? results.slice(-2)
      : results.length === 1
        ? results.slice(-1)
        : [];

  const userMessage = turnTail[0];
  const assistantMessages =
    turnTail.length > 1
      ? turnTail.slice(1).filter((m) => m.role === "assistant")
      : [];
  const lastAssistant = assistantMessages[assistantMessages.length - 1];

  const showAssistantLoading =
    awaitingAssistantStream &&
    (!lastAssistant || !hasRenderableAssistantContent(lastAssistant));

  useEffect(() => {
    if (!awaitingAssistantStream || !lastAssistant) return;
    if (hasRenderableAssistantContent(lastAssistant)) {
      setAwaitingAssistantStream(false);
    }
  }, [lastAssistant, awaitingAssistantStream, setAwaitingAssistantStream]);

  if (!paginated) {
    return (
      <Empty className="min-h-[12rem]">
        <Spinner />
      </Empty>
    );
  }

  const { status, loadMore } = paginated;
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  const lastPairContent =
    hasActiveUserTurn && userMessage ? (
      <>
        <ChatMessageBubble message={userMessage} namespace={userId} />
        {showAssistantLoading ? (
          <ChatAssistantLoadingBubble />
        ) : (
          assistantMessages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} namespace={userId} />
          ))
        )}
      </>
    ) : turnTail.length > 0 ? (
      turnTail.map((row) => (
        <ChatMessageBubble key={row.id} message={row} namespace={userId} />
      ))
    ) : null;

  return (
    <ChatJumpToLatestProvider
      viewportRef={viewportRef}
      messageCount={results.length}
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <FadeOverflow
          viewportRef={viewportRef}
          className="h-full min-h-0 flex-1"
        >
          <div className="mx-auto flex min-h-full w-full max-w-240 flex-col gap-0 pt-4">
            <LoadMoreSentinel
              onLoadMore={() => loadMore(PAGE_SIZE)}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              scrollContainerSelector='[data-slot="scroll-area-viewport"]'
            />
            {messagesBefore.length > 0 ? (
              <div className="flex w-full flex-col gap-5">
                {messagesBefore.map((row) => (
                  <ChatMessageListItem
                    key={row.id}
                    message={row}
                    namespace={userId}
                  />
                ))}
              </div>
            ) : null}

            {lastPairContent ? (
              <LastMessagePair
                className="flex w-full flex-shrink-0 flex-col justify-start gap-5 pt-5"
                style={
                  viewportHeight > 0 ? { minHeight: viewportHeight } : undefined
                }
              >
                {lastPairContent}
              </LastMessagePair>
            ) : (
              <Empty>
                <EmptyContent>
                  <EmptyDescription>No messages yet.</EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </div>
        </FadeOverflow>
        <JumpToLatest />
      </div>
    </ChatJumpToLatestProvider>
  );
}
