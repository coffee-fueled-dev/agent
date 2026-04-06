"use client";

import { api } from "@agent/backend/api";
import type { Doc, Id } from "@agent/backend/dataModel";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSessionIdArg } from "convex-helpers/react/sessions";
import { useMemo, useRef } from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { RequiredPaginatedResult } from "@/components/layout/required-result";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty.js";
import { Item, ItemHeader, ItemTitle } from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { eventsDetail, Link } from "@/navigation/index.js";

const PAGE_SIZE = 25;
const ESTIMATE_ROW = 88;

const listEventBusEntriesForSession =
  api.chat.eventBus.listEventBusEntriesForSession;

export type EventBusStreamScope =
  | { kind: "namespace" }
  | { kind: "thread"; threadId: string }
  | { kind: "sourceStream"; sourceStreamId: string };

export type EventBusStreamOptionalFilters = {
  eventTypeId?: string;
  streamTypeId?: string;
  eventTimeMin?: number;
  eventTimeMax?: number;
};

export type EventBusStreamListProps = {
  userId: string | undefined;
  scope: EventBusStreamScope;
  filters?: EventBusStreamOptionalFilters;
  /** `sidebar`: time in tooltip (chat). `page`: time inline (events index). */
  variant?: "page" | "sidebar";
  emptyTitle?: string;
};

type BusListRow = {
  busEntry: Doc<"eventBusEntries">;
  eventTypeLabel: string;
  streamTypeLabel: string;
};

function EventRowLinkPage({ row }: { row: BusListRow }) {
  const href = eventsDetail(row.busEntry._id);
  return (
    <Item size="sm" asChild>
      <Link href={href} className="no-underline">
        <ItemHeader className="min-w-0 gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <ItemTitle className="w-full min-w-0 max-w-full truncate text-xs">
              {row.eventTypeLabel}
            </ItemTitle>
            <span className="text-muted-foreground min-w-0 max-w-full truncate text-xs">
              {row.streamTypeLabel}
            </span>
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
            {new Date(row.busEntry.eventTime).toLocaleString()}
          </span>
        </ItemHeader>
      </Link>
    </Item>
  );
}

function EventRowLinkSidebar({ row }: { row: BusListRow }) {
  const href = eventsDetail(row.busEntry._id);
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
                  {row.streamTypeLabel}
                </span>
              </div>
            </ItemHeader>
          </Link>
        </Item>
      </TooltipTrigger>
      <TooltipContent side="left">
        {new Date(row.busEntry.eventTime).toLocaleString()}
      </TooltipContent>
    </Tooltip>
  );
}

function EventBusVirtualizedPage({
  results,
  loadMore,
  canLoadMore,
  isLoadingMore,
}: {
  results: BusListRow[];
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
    <FadeOverflow
      viewportRef={viewportRef}
      className="h-full min-h-0 flex-1 px-8"
    >
      <div
        className="relative pr-2 w-full max-w-4xl"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = results[vi.index];
          if (!row) return null;
          return (
            <div
              key={row.busEntry._id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-2"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <EventRowLinkPage row={row} />
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

function EventBusVirtualizedSidebar({
  results,
  loadMore,
  canLoadMore,
  isLoadingMore,
}: {
  results: BusListRow[];
  loadMore: (n: number) => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => viewportRef.current,
    getItemKey: (index) => results[index]?.busEntry._id ?? index,
    estimateSize: () => 72,
    gap: 6,
    overscan: 8,
  });

  return (
    <FadeOverflow viewportRef={viewportRef} className="min-h-0 flex-1">
      <div
        className="relative w-full max-w-4xl"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = results[vi.index];
          if (!row) return null;
          return (
            <div
              key={row.busEntry._id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <EventRowLinkSidebar row={row} />
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

export function EventBusStreamList({
  userId,
  scope,
  filters,
  variant = "page",
  emptyTitle = "No events yet.",
}: EventBusStreamListProps) {
  const baseArgs = useMemo(() => {
    if (!userId) return "skip" as const;
    const f = filters ?? {};
    return {
      userId,
      scope,
      ...(f.eventTypeId != null && {
        eventTypeId: f.eventTypeId as Id<"dimensions">,
      }),
      ...(f.streamTypeId != null && {
        streamTypeId: f.streamTypeId as Id<"dimensions">,
      }),
      ...(f.eventTimeMin != null && { eventTimeMin: f.eventTimeMin }),
      ...(f.eventTimeMax != null && { eventTimeMax: f.eventTimeMax }),
    };
  }, [userId, scope, filters]);
  const sessionArgs = useSessionIdArg(baseArgs);

  const RowVirtualized =
    variant === "sidebar"
      ? EventBusVirtualizedSidebar
      : EventBusVirtualizedPage;

  const inner = ({
    results,
    status,
    loadMore,
  }: {
    results: BusListRow[];
    status: string;
    loadMore: (n: number) => void;
  }) => {
    const canLoadMore = status === "CanLoadMore";
    const isLoadingMore = status === "LoadingMore";

    if (results.length > 0) {
      return (
        <RowVirtualized
          results={results}
          loadMore={loadMore}
          canLoadMore={canLoadMore}
          isLoadingMore={isLoadingMore}
        />
      );
    }

    return (
      <Empty>
        <EmptyContent>
          <EmptyDescription>{emptyTitle}</EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  };

  if (variant === "sidebar") {
    return (
      <TooltipProvider>
        <RequiredPaginatedResult
          query={listEventBusEntriesForSession}
          args={sessionArgs}
          initialNumItems={PAGE_SIZE}
        >
          {({ results, status, loadMore }) =>
            inner({ results: results as BusListRow[], status, loadMore })
          }
        </RequiredPaginatedResult>
      </TooltipProvider>
    );
  }

  return (
    <RequiredPaginatedResult
      query={listEventBusEntriesForSession}
      args={sessionArgs}
      initialNumItems={PAGE_SIZE}
    >
      {({ results, status, loadMore }) =>
        inner({ results: results as BusListRow[], status, loadMore })
      }
    </RequiredPaginatedResult>
  );
}
