"use client";

import { api } from "@agent/backend/api";
import type { Doc, Id } from "@agent/backend/dataModel";
import { useSessionIdArg } from "convex-helpers/react/sessions";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { estimateTwoLineItemTextHeight } from "./two-line-item-pretext.js";

const PAGE_SIZE = 25;

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

function EventBusRowLabels({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  const textColRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  useLayoutEffect(() => {
    const el = textColRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setTextWidth(el.clientWidth);
    });
    ro.observe(el);
    setTextWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const minHeight = useMemo(
    () => estimateTwoLineItemTextHeight(primary, secondary, textWidth),
    [primary, secondary, textWidth],
  );

  return (
    <div
      ref={textColRef}
      className="min-w-0 flex-1 flex flex-col gap-0.5"
      style={minHeight > 0 ? { minHeight } : undefined}
    >
      <ItemTitle className="w-full min-w-0 max-w-full break-words text-xs leading-4 font-medium">
        {primary}
      </ItemTitle>
      <span className="text-muted-foreground min-w-0 max-w-full break-words text-xs leading-4">
        {secondary}
      </span>
    </div>
  );
}

function EventRowLinkPage({ row }: { row: BusListRow }) {
  const href = eventsDetail(row.busEntry._id);
  return (
    <Item size="sm" asChild>
      <Link href={href} className="no-underline">
        <ItemHeader className="min-w-0 items-start gap-2">
          <EventBusRowLabels
            primary={row.eventTypeLabel}
            secondary={row.streamTypeLabel}
          />
          <span className="text-muted-foreground shrink-0 font-mono text-[10px] leading-[14px] tabular-nums">
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
            <ItemHeader className="min-w-0 items-start gap-2">
              <EventBusRowLabels
                primary={row.eventTypeLabel}
                secondary={row.streamTypeLabel}
              />
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

function EventBusListPage({
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

  return (
    <FadeOverflow
      viewportRef={viewportRef}
      className="h-full min-h-0 flex-1 px-8"
    >
      <div className="flex flex-col gap-2 pr-2 w-full max-w-4xl">
        {results.map((row) => (
          <EventRowLinkPage key={row.busEntry._id} row={row} />
        ))}
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

function EventBusListSidebar({
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

  return (
    <FadeOverflow viewportRef={viewportRef} className="min-h-0 flex-1">
      <div className="flex flex-col gap-1.5 w-full max-w-4xl">
        {results.map((row) => (
          <EventRowLinkSidebar key={row.busEntry._id} row={row} />
        ))}
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

  const RowList =
    variant === "sidebar" ? EventBusListSidebar : EventBusListPage;

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
        <RowList
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
