import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { type UIMessagesQuery, useUIMessages } from "@convex-dev/agent/react";
import type { StreamArgs } from "@convex-dev/agent/validators";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "@very-coffee/backend/api";
import type { FunctionReference } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { Empty, EmptyContent, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { UIMessage } from "../../../../../../packages/backend/convex/agents/_tools/uiMessage.js";
import {
  ChatJumpToLatestProvider,
  JumpToLatest,
  LastMessagePair,
} from "./chat-jump-to-latest-provider.js";
import { ChatMessagePart } from "./chat-message-part.js";

const PAGE_SIZE = 15;

type StreamQuery = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    paginationOpts: { cursor: string | null; numItems: number };
    streamArgs?: StreamArgs;
  },
  { streams: SyncStreamsReturnValue }
>;

const listThreadMessagesQuery = api.chat.thread
  .listThreadMessages as UIMessagesQuery<{ threadId: string }, UIMessage> &
  StreamQuery;

const ESTIMATE_ROW = 120;

export function ChatMessageList({ threadId }: { threadId: string }) {
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

  const paginated = useUIMessages(
    listThreadMessagesQuery,
    { threadId },
    {
      initialNumItems: PAGE_SIZE,
      stream: true,
    },
  );

  const results =
    paginated?.results.filter((message) => message.role !== "system") ?? [];

  const messagesBefore =
    results.length >= 2 ? results.slice(0, -2) : ([] as UIMessage[]);
  const lastPair: UIMessage[] =
    results.length >= 2
      ? results.slice(-2)
      : results.length === 1
        ? results.slice(-1)
        : [];

  const virtualizer = useVirtualizer({
    count: messagesBefore.length,
    getScrollElement: () => viewportRef.current,
    getItemKey: (index) => messagesBefore[index]?.id ?? index,
    estimateSize: () => ESTIMATE_ROW,
    gap: 20,
    overscan: 6,
  });

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

  return (
    <ChatJumpToLatestProvider
      viewportRef={viewportRef}
      messageCount={results.length}
      threadId={threadId}
    >
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <FadeOverflow viewportRef={viewportRef} className="h-full min-h-0 flex-1">
          <div className="mx-auto flex min-h-full w-full max-w-240 flex-col gap-0 pt-4">
            <LoadMoreSentinel
              onLoadMore={() => loadMore(PAGE_SIZE)}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              scrollContainerSelector='[data-slot="scroll-area-viewport"]'
            />
            {messagesBefore.length > 0 ? (
              <div
                className="relative w-full space-y-5"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = messagesBefore[vi.index];
                  if (!row) return null;
                  return (
                    <div
                      key={row.id}
                      data-index={vi.index}
                      ref={virtualizer.measureElement}
                      className="absolute top-0 left-0 flex w-full flex-col"
                      style={{
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <ChatMessageBubble message={row} />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {lastPair.length > 0 ? (
              <LastMessagePair
                className="flex w-full flex-shrink-0 flex-col justify-start gap-5 pt-5"
                style={
                  viewportHeight > 0 ? { minHeight: viewportHeight } : undefined
                }
              >
                {lastPair.map((row) => (
                  <ChatMessageBubble key={row.id} message={row} />
                ))}
              </LastMessagePair>
            ) : (
              <Empty>
                <EmptyContent>
                  <EmptyTitle>No messages yet.</EmptyTitle>
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

function ChatMessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg text-sm ${
        isUser && "ml-auto max-w-lg bg-muted/50 text-muted-foreground p-4"
      }`}
    >
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
