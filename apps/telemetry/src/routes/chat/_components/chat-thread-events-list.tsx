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
import { Item, ItemHeader, ItemTitle } from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { eventsDetail, Link } from "@/navigation/index.js";

const PAGE_SIZE = 25;
const ESTIMATE_EVENT_ROW = 72;

/** Server hydrates labels from `unifiedTimelineDimensions`. */
type UnifiedTimelineListRow = Doc<"unifiedTimeline"> & {
  eventTypeLabel: string;
  sourceStreamTypeLabel: string;
};

/** zCustomQuery widens args; assert session + pagination shape for useSessionPaginatedQuery. */
const listUnifiedTimelineQuery = api.chat.unifiedTimeline
  .listUnifiedTimeline as FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; threadId: string; paginationOpts: PaginationOptions },
  PaginationResult<UnifiedTimelineListRow>
>;

function ThreadEventRowLink({ row }: { row: UnifiedTimelineListRow }) {
  const href = eventsDetail(row._id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Item size="sm" asChild className="flex-col items-stretch">
          <Link href={href}>
            <ItemHeader className="min-w-0 gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <ItemTitle className="w-full min-w-0 max-w-full truncate text-xs">
                  {row.eventTypeLabel}
                </ItemTitle>
                <span className="text-muted-foreground min-w-0 max-w-full truncate text-xs">
                  {row.sourceStreamTypeLabel}
                </span>
              </div>
            </ItemHeader>
          </Link>
        </Item>
      </TooltipTrigger>
      <TooltipContent side="left">
        {new Date(row.eventTime).toLocaleString()}
      </TooltipContent>
    </Tooltip>
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
          <TooltipProvider>
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
                        {(row) => (
                          <ThreadEventRowLink key={row._id} row={row} />
                        )}
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
          </TooltipProvider>
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
  results: UnifiedTimelineListRow[];
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
