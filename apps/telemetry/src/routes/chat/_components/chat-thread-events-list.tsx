"use client";

import { api } from "@backend/api.js";
import type { Doc } from "@backend/dataModel.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { SessionId } from "convex-helpers/server/sessions";
import { useRef } from "react";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { ListSection } from "@/components/layout/list-section";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { RequiredPaginatedResult } from "@/components/layout/required-result";
import {
  Item,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { eventsDetail, Link } from "@/navigation/index.js";

const PAGE_SIZE = 25;
const ESTIMATE_EVENT_ROW = 72;

/** zCustomQuery widens args; assert session + pagination shape for useSessionPaginatedQuery. */
const listUnifiedTimelineQuery = api.chat.unifiedTimeline
  .listUnifiedTimeline as FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; threadId: string; paginationOpts: PaginationOptions },
  PaginationResult<Doc<"unifiedTimeline">>
>;

function ThreadEventRowLink({ row }: { row: Doc<"unifiedTimeline"> }) {
  const href = eventsDetail(row._id);
  return (
    <Item
      size="sm"
      variant="outline"
      asChild
      className="flex-col items-stretch"
    >
      <Link href={href} className="no-underline">
        <ItemHeader className="min-w-0 gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <ItemTitle className="w-full min-w-0 max-w-full truncate text-xs">
              {row.eventType}
            </ItemTitle>
            <span className="text-muted-foreground min-w-0 max-w-full truncate text-xs">
              {row.sourceStreamType}
            </span>
          </div>
        </ItemHeader>
        <ItemDescription className="font-mono text-xs tabular-nums">
          {new Date(row.eventTime).toLocaleString()}
        </ItemDescription>
      </Link>
    </Item>
  );
}

export function ChatThreadEventsList({ threadId }: { threadId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CollapsibleItemGroup defaultOpen className="min-h-0 flex-1">
        <CollapsibleItemGroup.Title className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Event Stream
        </CollapsibleItemGroup.Title>
        <CollapsibleItemGroup.Content>
          <RequiredPaginatedResult
            query={listUnifiedTimelineQuery}
            args={{ threadId }}
            initialNumItems={PAGE_SIZE}
          >
            {({ results, status, loadMore, isLoading }) => {
              const canLoadMore = status === "CanLoadMore";
              const isLoadingMore = status === "LoadingMore";

              if (results.length > 0) {
                return (
                  <FadeOverflowWithVirtual
                    results={results}
                    loadMore={loadMore}
                    canLoadMore={canLoadMore}
                    isLoadingMore={isLoadingMore}
                  />
                );
              }

              return (
                <FadeOverflow className="min-h-0 flex-1">
                  <CollapsibleItemGroup.ItemGroup className="pr-1">
                    <ListSection
                      list={results}
                      loading={isLoading}
                      className="gap-1.5"
                    >
                      <ListSection.Loading />
                      <ListSection.Empty>
                        <span className="text-muted-foreground text-xs">
                          Nothing yet.
                        </span>
                      </ListSection.Empty>
                      {(row) => <ThreadEventRowLink key={row._id} row={row} />}
                    </ListSection>
                  </CollapsibleItemGroup.ItemGroup>
                  <LoadMoreSentinel
                    onLoadMore={() => loadMore(PAGE_SIZE)}
                    canLoadMore={canLoadMore}
                    isLoadingMore={isLoadingMore}
                    scrollContainerSelector='[data-slot="scroll-area-viewport"]'
                  />
                </FadeOverflow>
              );
            }}
          </RequiredPaginatedResult>
        </CollapsibleItemGroup.Content>
      </CollapsibleItemGroup>
    </div>
  );
}

function FadeOverflowWithVirtual({
  results,
  loadMore,
  canLoadMore,
  isLoadingMore,
}: {
  results: Doc<"unifiedTimeline">[];
  loadMore: (n: number) => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ESTIMATE_EVENT_ROW,
    overscan: 8,
  });

  return (
    <FadeOverflow viewportRef={viewportRef} className="min-h-0 flex-1">
      <CollapsibleItemGroup.ItemGroup className="pr-1">
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const row = results[vi.index];
            if (!row) return null;
            return (
              <div
                key={row._id}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                className="absolute top-0 left-0 w-full pb-1.5"
                style={{ transform: `translateY(${vi.start}px)` }}
              >
                <ThreadEventRowLink row={row} />
              </div>
            );
          })}
        </div>
      </CollapsibleItemGroup.ItemGroup>
      <LoadMoreSentinel
        onLoadMore={() => loadMore(PAGE_SIZE)}
        canLoadMore={canLoadMore}
        isLoadingMore={isLoadingMore}
        scrollContainerSelector='[data-slot="scroll-area-viewport"]'
      />
    </FadeOverflow>
  );
}
