import { api } from "@backend/api.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ActivityIcon } from "lucide-react";
import { useRef } from "react";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group.js";
import { formatTime } from "@/components/formatters/index.js";
import { FadeOverflow } from "@/components/layout/fade-overflow.js";
import { ListSection } from "@/components/layout/list-section.js";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel.js";
import { RequiredPaginatedResult } from "@/components/layout/required-result.js";
import { Badge } from "@/components/ui/badge.js";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item.js";
import { contextActivityEvent, Link } from "@/navigation/index.js";

const PAGE_SIZE = 15;
const ESTIMATE_ACCESS_ROW = 72;

type AccessEvent = {
  eventId: string;
  eventType: string;
  eventTime: number;
  namespace?: string;
  payload?: { namespace?: string; rank?: number; score?: number };
  actor?: { byType: string; byId: string };
  session?: string;
};

function EventRow({
  ev,
  entryId,
  namespace,
}: {
  ev: AccessEvent;
  entryId: string;
  namespace: string;
}) {
  const href = `/context/${encodeURIComponent(entryId)}/activity/${encodeURIComponent(ev.eventId)}?namespace=${encodeURIComponent(namespace)}`;
  const label =
    ev.eventType === "viewed"
      ? "Viewed"
      : ev.eventType === "searched"
        ? "Searched"
        : ev.eventType;
  const detail =
    ev.eventType === "searched" && ev.payload?.rank !== undefined
      ? `rank ${ev.payload.rank + 1} · score ${ev.payload.score?.toFixed(4) ?? "—"}`
      : null;
  const actorLabel = ev.actor
    ? `${ev.actor.byType}:${ev.actor.byId.length > 20 ? `${ev.actor.byId.slice(0, 18)}…` : ev.actor.byId}`
    : null;
  const sessionLabel = ev.session
    ? ev.session.length > 24
      ? `${ev.session.slice(0, 22)}…`
      : ev.session
    : null;

  return (
    <Item size="sm" variant="outline" asChild>
      <Link href={href} className="no-underline">
        <ItemContent className="min-w-0 gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {label}
            </Badge>
            <ItemTitle className="text-xs font-normal text-muted-foreground">
              {formatTime(ev.eventTime)}
            </ItemTitle>
          </span>
          {detail ? (
            <ItemDescription className="font-mono text-[11px]">
              {detail}
            </ItemDescription>
          ) : null}
          {(actorLabel || sessionLabel) && (
            <ItemDescription className="text-[11px] text-muted-foreground">
              {[actorLabel, sessionLabel].filter(Boolean).join(" · ")}
            </ItemDescription>
          )}
        </ItemContent>
      </Link>
    </Item>
  );
}

function EntryAccessVirtualized({
  results,
  entryId,
  namespace,
  loadMore,
  canLoadMore,
  isLoadingMore,
}: {
  results: AccessEvent[];
  entryId: string;
  namespace: string;
  loadMore: (n: number) => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => ESTIMATE_ACCESS_ROW,
    overscan: 8,
  });

  return (
    <FadeOverflow viewportRef={viewportRef} className="h-full">
      <div
        className="relative pr-2"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const ev = results[vi.index] as AccessEvent | undefined;
          if (!ev) return null;
          return (
            <div
              key={ev.eventId}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full pb-2"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <EventRow ev={ev} entryId={entryId} namespace={namespace} />
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

export function EntryAccessEventsList({
  namespace,
  entryId,
}: {
  namespace: string;
  entryId: string;
}) {
  return (
    <RequiredPaginatedResult
      query={api.context.entryAccess.listContextEntryAccessEvents}
      args={{ namespace, entryId }}
      initialNumItems={PAGE_SIZE}
    >
      {(paginated) => {
        const { results, status, loadMore, isLoading } = paginated;
        const canLoadMore = status === "CanLoadMore";
        const isLoadingMore = status === "LoadingMore";
        const countLabel =
          canLoadMore && results.length > 0
            ? (`> ${results.length}` as const)
            : results.length;

        return (
          <CollapsibleItemGroup defaultOpen itemCount={countLabel}>
            <CollapsibleItemGroup.Title>
              <ActivityIcon className="size-3.5 text-muted-foreground" /> Access
              history
            </CollapsibleItemGroup.Title>
            <CollapsibleItemGroup.Content className="h-96">
              {results.length > 0 ? (
                <EntryAccessVirtualized
                  results={results as AccessEvent[]}
                  entryId={entryId}
                  namespace={namespace}
                  loadMore={loadMore}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                />
              ) : (
                <FadeOverflow className="h-full">
                  <ListSection
                    list={results}
                    loading={isLoading}
                    className="gap-2 pr-2"
                  >
                    <ListSection.Loading />
                    <ListSection.Empty>
                      No views or searches recorded yet.
                    </ListSection.Empty>
                    {(ev) => (
                      <EventRow
                        key={ev.eventId}
                        ev={ev as AccessEvent}
                        entryId={entryId}
                        namespace={namespace}
                      />
                    )}
                  </ListSection>
                  <LoadMoreSentinel
                    onLoadMore={() => loadMore(PAGE_SIZE)}
                    canLoadMore={canLoadMore}
                    isLoadingMore={isLoadingMore}
                    scrollContainerSelector='[data-slot="scroll-area-viewport"]'
                  />
                </FadeOverflow>
              )}
            </CollapsibleItemGroup.Content>
          </CollapsibleItemGroup>
        );
      }}
    </RequiredPaginatedResult>
  );
}
