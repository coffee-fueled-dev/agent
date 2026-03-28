"use client";

import { api } from "@backend/api.js";
import type { Doc } from "@backend/dataModel.js";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import type { SessionId } from "convex-helpers/server/sessions";
import { CollapsibleItemGroup } from "@/components/blocks/collapsible-item-group";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import { ListSection } from "@/components/layout/list-section";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { RequiredPaginatedResult } from "@/components/layout/required-result";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";

const PAGE_SIZE = 25;

/** zCustomQuery widens args; assert session + pagination shape for useSessionPaginatedQuery. */
const listUnifiedTimelineQuery = api.chat.unifiedTimeline
  .listUnifiedTimeline as FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; threadId: string; paginationOpts: PaginationOptions },
  PaginationResult<Doc<"unifiedTimeline">>
>;

export function ChatThreadEventsList({ threadId }: { threadId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CollapsibleItemGroup defaultOpen={false} className="min-h-0 flex-1">
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
                        <Item
                          key={`${row.sourceStreamType}-${row.sourceEventId}-${row.sourceGlobalSequence}`}
                          variant="outline"
                          size="sm"
                          className="flex-col items-stretch"
                        >
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
                          {(row.actor ?? row.session ?? row.correlationId) ? (
                            <ItemContent className="min-w-0 gap-0.5">
                              {row.actor ? (
                                <ItemDescription className="min-w-0 line-clamp-1 font-mono text-xs">
                                  {row.actor.byType} · {row.actor.byId}
                                </ItemDescription>
                              ) : null}
                              {row.session ? (
                                <ItemDescription className="min-w-0 line-clamp-1 font-mono text-xs">
                                  session {row.session}
                                </ItemDescription>
                              ) : null}
                              {row.correlationId ? (
                                <ItemDescription className="min-w-0 line-clamp-1 font-mono text-xs">
                                  correlation → {row.correlationId}
                                </ItemDescription>
                              ) : null}
                            </ItemContent>
                          ) : null}
                        </Item>
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
        </CollapsibleItemGroup.Content>
      </CollapsibleItemGroup>
    </div>
  );
}
