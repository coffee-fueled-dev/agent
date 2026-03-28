"use client";

import { api } from "@backend/api.js";
import { useSessionPaginatedQuery } from "convex-helpers/react/sessions";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

const PAGE_SIZE = 25;

export function ChatThreadEventsList({ threadId }: { threadId: string }) {
  const paginated = useSessionPaginatedQuery(
    api.chat.unifiedTimeline.listUnifiedTimeline,
    { threadId },
    { initialNumItems: PAGE_SIZE },
  );

  if (!paginated) {
    return (
      <Empty className="min-h-[8rem] py-6">
        <Spinner />
      </Empty>
    );
  }

  const { results, status, loadMore, isLoading } = paginated;
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="text-muted-foreground border-b border-border pb-2 text-xs font-medium uppercase tracking-wide">
        Unified timeline
      </div>
      <FadeOverflow className="min-h-0 flex-1">
        <ul className="flex flex-col gap-1.5 pr-1">
          {results.length === 0 && !isLoading ? (
            <li className="text-muted-foreground text-xs">
              No projected events yet. Identity and context memory events appear
              here after the projector runs.
            </li>
          ) : null}
          {results.map((row) => (
            <li
              key={`${row.sourceStreamType}-${row.sourceEventId}-${row.sourceGlobalSequence}`}
              className="bg-card/80 rounded-md border border-border/80 px-2 py-1.5 text-[11px] leading-snug"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-foreground font-medium">
                  {row.eventType}
                </span>
                <span className="text-muted-foreground">
                  {row.sourceStreamType}
                </span>
                <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px]">
                  {new Date(row.eventTime).toLocaleString()}
                </span>
              </div>
              {row.actor ? (
                <div className="text-muted-foreground mt-0.5 text-[10px]">
                  {row.actor.byType} ·{" "}
                  <span className="font-mono">
                    {row.actor.byId.slice(0, 10)}…
                  </span>
                </div>
              ) : null}
              {row.session ? (
                <div className="text-muted-foreground font-mono text-[10px]">
                  session {row.session.slice(0, 14)}…
                </div>
              ) : null}
              {row.correlationId ? (
                <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                  correlation → {row.correlationId.slice(0, 12)}…
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <LoadMoreSentinel
          onLoadMore={() => loadMore(PAGE_SIZE)}
          canLoadMore={canLoadMore}
          isLoadingMore={isLoadingMore}
          scrollContainerSelector='[data-slot="scroll-area-viewport"]'
        />
      </FadeOverflow>
    </div>
  );
}
