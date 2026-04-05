"use client";

import { api } from "@very-coffee/backend/api";
import { usePaginatedQuery } from "convex/react";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { ActivityIcon, PlusIcon } from "lucide-react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import {
  SidebarGroup,
  SidebarGroupButton,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicEnv } from "@/env/index.js";
import { cn } from "@/lib/utils";
import { chat, eventsList, Link } from "@/navigation/index.js";

const PAGE_SIZE = 15;

type ThreadRow = {
  _id: string;
  _creationTime: number;
  title?: string;
};

const listRecentThreadsQuery = api.chat.thread
  .listRecentThreads as FunctionReference<
  "query",
  "public",
  { userId: string; paginationOpts: PaginationOptions },
  PaginationResult<ThreadRow>
>;

function ChatThreadHistoryList({ onNavigate }: { onNavigate?: () => void }) {
  const { accountToken: userId } = usePublicEnv();
  const paginated = usePaginatedQuery(
    listRecentThreadsQuery,
    userId ? { userId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  if (!userId) return null;
  if (!paginated) {
    return (
      <p className="text-muted-foreground px-1 py-0.5 text-[11px]">Loading…</p>
    );
  }

  const { results, status, loadMore, isLoading } = paginated;
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  if (results.length === 0 && !isLoading) {
    return (
      <p className="text-muted-foreground px-1 py-0.5 text-[11px]">
        No chats yet
      </p>
    );
  }

  return (
    <FadeOverflow className="max-h-48 min-h-0">
      <div className="flex flex-col gap-0.5 pr-1">
        {results.map((row) => (
          <SidebarGroupButton key={row._id} depth={1} asChild>
            <Link
              href={chat({ thread: row._id })}
              onBeforeNavigate={onNavigate}
              className="block min-w-0 truncate"
            >
              {row.title?.trim() || "Untitled"}
            </Link>
          </SidebarGroupButton>
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

export function AppSidebarMobileNav() {
  const { closeMobile } = useSidebar();
  return <AppSidebarNav onNavigate={closeMobile} forceExpanded />;
}

/** `forceExpanded`: always show text links (e.g. mobile sheet when desktop rail is collapsed). */
export function AppSidebarNav({
  onNavigate,
  className,
  forceExpanded,
}: {
  onNavigate?: () => void;
  className?: string;
  forceExpanded?: boolean;
}) {
  const { isExpanded } = useSidebar();
  const showText = forceExpanded || isExpanded;

  if (!showText) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-1 self-center",
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarGroupButton collapsed asChild>
              <Link
                href={chat({ new: true })}
                onBeforeNavigate={onNavigate}
                aria-label="New chat"
              >
                <PlusIcon className="size-4" />
              </Link>
            </SidebarGroupButton>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 max-h-96", className)}>
      <SidebarGroup>
        <span className="flex items-center justify-between">
          <SidebarGroupLabel>Chat</SidebarGroupLabel>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href={chat({ new: true })}>
                  <PlusIcon className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        </span>
        <SidebarGroupContent>
          <ChatThreadHistoryList onNavigate={onNavigate} />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Observability</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarGroupButton depth={1} asChild>
            <Link
              href={eventsList()}
              onBeforeNavigate={onNavigate}
              className="flex min-w-0 items-center gap-2"
            >
              <ActivityIcon className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">Events</span>
            </Link>
          </SidebarGroupButton>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
