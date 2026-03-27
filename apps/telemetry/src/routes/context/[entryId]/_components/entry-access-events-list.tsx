import { ActivityIcon } from "lucide-react";
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
import { api } from "../../../../../../../convex/_generated/api.js";

const PAGE_SIZE = 15;

type AccessEvent = {
  eventId: string;
  eventType: string;
  eventTime: number;
  payload?: { namespace?: string; rank?: number; score?: number };
  actor?: { byType: string; byId: string };
  session?: string;
};

function EventRow({ ev }: { ev: AccessEvent }) {
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
    <Item size="sm" variant="outline">
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
    </Item>
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
      query={api.context.contextApi.listContextEntryAccessEvents}
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
          <CollapsibleItemGroup itemCount={countLabel}>
            <CollapsibleItemGroup.Title>
              <ActivityIcon className="size-3.5 text-muted-foreground" /> Access
              history
            </CollapsibleItemGroup.Title>
            <CollapsibleItemGroup.Content className="h-64">
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
                  {(ev) => <EventRow key={ev.eventId} ev={ev} />}
                </ListSection>
                <LoadMoreSentinel
                  onLoadMore={() => loadMore(PAGE_SIZE)}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  scrollContainerSelector='[data-slot="scroll-area-viewport"]'
                />
              </FadeOverflow>
            </CollapsibleItemGroup.Content>
          </CollapsibleItemGroup>
        );
      }}
    </RequiredPaginatedResult>
  );
}
