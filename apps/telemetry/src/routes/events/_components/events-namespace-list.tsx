"use client";

import { api } from "@backend/api.js";
import type { Doc } from "@backend/dataModel.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { useSessionIdArg } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { useRef } from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { ListSection } from "@/components/layout/list-section";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { RequiredPaginatedResult } from "@/components/layout/required-result";
import { Item, ItemHeader, ItemTitle } from "@/components/ui/item";

const PAGE_SIZE = 25;
const ESTIMATE_ROW = 88;

const listUnifiedTimelineByNamespaceQuery = api.chat.unifiedTimeline
  .listUnifiedTimelineByNamespace as FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; paginationOpts: PaginationOptions },
  PaginationResult<Doc<"unifiedTimeline">>
>;

function EventRowLink({ row }: { row: Doc<"unifiedTimeline"> }) {
  const href = `/events/${encodeURIComponent(row._id)}`;
  return (
    <Item size="sm" variant="outline" asChild>
      <a href={href} className="no-underline">
        <ItemHeader className="min-w-0 gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <ItemTitle className="w-full min-w-0 max-w-full truncate text-xs">
              {row.eventType}
            </ItemTitle>
            <span className="text-muted-foreground min-w-0 max-w-full truncate text-xs">
              {row.sourceStreamType}
            </span>
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
            {new Date(row.eventTime).toLocaleString()}
          </span>
        </ItemHeader>
      </a>
    </Item>
  );
}

function EventsVirtualized({
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
    estimateSize: () => ESTIMATE_ROW,
    overscan: 8,
  });

  return (
    <FadeOverflow viewportRef={viewportRef} className="min-h-[24rem] flex-1">
      <div
        className="relative pr-2"
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
              className="absolute top-0 left-0 w-full pb-2"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <EventRowLink row={row} />
            </div>
          );
        })}
      </div>
      <LoadMoreSentinel
        onLoadMore={() => loadMore(PAGE_SIZE)}
        canLoadMore={canLoadMore}
        isLoadingMore={isLoadingMore}
        scrollContainerSelector='[data-slot="scroll-area-viewport"]'
      />
    </FadeOverflow>
  );
}

export function EventsNamespaceList() {
  const sessionArgs = useSessionIdArg({});

  return (
    <RequiredPaginatedResult
      query={listUnifiedTimelineByNamespaceQuery}
      args={sessionArgs}
      initialNumItems={PAGE_SIZE}
    >
      {({ results, status, loadMore, isLoading }) => {
        const canLoadMore = status === "CanLoadMore";
        const isLoadingMore = status === "LoadingMore";

        if (results.length > 0) {
          return (
            <EventsVirtualized
              results={results}
              loadMore={loadMore}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
            />
          );
        }

        return (
          <FadeOverflow className="min-h-[12rem] flex-1">
            <ListSection
              list={results}
              loading={isLoading}
              className="gap-2 pr-2"
            >
              <ListSection.Loading />
              <ListSection.Empty>
                <span className="text-muted-foreground text-sm">
                  No telemetry events yet.
                </span>
              </ListSection.Empty>
              {(row) => <EventRowLink key={row._id} row={row} />}
            </ListSection>
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
  );
}
