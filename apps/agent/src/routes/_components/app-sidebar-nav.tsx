"use client";

import { api } from "@very-coffee/backend/api";
import { usePaginatedQuery } from "convex/react";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { PlusIcon } from "lucide-react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import {
  SidebarGroup,
  SidebarGroupButton,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/layout/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicEnv } from "@/env/index.js";
import { cn } from "@/lib/utils";
import { chat, Link } from "@/navigation/index.js";

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

export function AppSidebarMobileNav({
  current,
}: {
  current: "context" | "chat" | "events";
}) {
  const { closeMobile } = useSidebar();
  return (
    <AppSidebarNav current={current} onNavigate={closeMobile} forceExpanded />
  );
}

/** `forceExpanded`: always show text links (e.g. mobile sheet when desktop rail is collapsed). */
export function AppSidebarNav({
  current,
  onNavigate,
  className,
  forceExpanded,
}: {
  current: "context" | "chat" | "events";
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
    <div className={cn("flex flex-col gap-4", className)}>
      <SidebarGroup>
        <SidebarGroupLabel>Chat</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarGroupButton
            variant={current === "chat" ? "secondary" : "ghost"}
            asChild
          >
            <Link
              href={chat({ new: true })}
              onBeforeNavigate={onNavigate}
              className="flex items-center gap-2"
            >
              <PlusIcon className="size-4 shrink-0" />
              Chat
            </Link>
          </SidebarGroupButton>
          <ChatThreadHistoryList onNavigate={onNavigate} />
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
