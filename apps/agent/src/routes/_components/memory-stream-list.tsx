"use client";

import { api } from "@agent/backend/api";
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

const PAGE_SIZE = 25;
const ESTIMATE_ROW = 88;

const listMemoryRecordsForSession =
  api.memories.list.listMemoryRecordsForSession;

export type MemoryListRow = {
  _id: string;
  _creationTime: number;
  namespace: string;
  key: string;
  title?: string;
};

export type MemoryStreamListProps = {
  userId: string | undefined;
  emptyTitle?: string;
};

function MemoryRowPage({ row }: { row: MemoryListRow }) {
  const title = row.title?.trim();
  const primary = title || row.key;
  const secondary =
    title && row.key !== title ? (
      <span className="text-muted-foreground min-w-0 max-w-full truncate text-xs">
        {row.key}
      </span>
    ) : null;

  return (
    <Item size="sm" variant="outline">
      <ItemHeader className="min-w-0 gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <ItemTitle className="w-full min-w-0 max-w-full truncate text-xs">
            {primary}
          </ItemTitle>
          {secondary}
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">
          {new Date(row._creationTime).toLocaleString()}
        </span>
      </ItemHeader>
    </Item>
  );
}

function MemoryVirtualizedPage({
  results,
  loadMore,
  canLoadMore,
  isLoadingMore,
}: {
  results: MemoryListRow[];
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
              <MemoryRowPage row={row} />
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

export function MemoryStreamList({
  userId,
  emptyTitle = "No memories yet.",
}: MemoryStreamListProps) {
  const baseArgs = useMemo(
    () => (userId ? { userId } : ("skip" as const)),
    [userId],
  );
  const sessionArgs = useSessionIdArg(baseArgs);

  return (
    <RequiredPaginatedResult
      query={listMemoryRecordsForSession}
      args={sessionArgs}
      initialNumItems={PAGE_SIZE}
    >
      {({ results, status, loadMore }) => {
        const canLoadMore = status === "CanLoadMore";
        const isLoadingMore = status === "LoadingMore";

        if (results.length > 0) {
          return (
            <MemoryVirtualizedPage
              results={results as MemoryListRow[]}
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
      }}
    </RequiredPaginatedResult>
  );
}
