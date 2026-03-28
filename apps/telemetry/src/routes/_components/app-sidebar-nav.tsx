"use client";

import { api } from "@backend/api.js";
import { BookOpenIcon, PlusIcon } from "lucide-react";
import type {
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";
import { useSessionPaginatedQuery } from "convex-helpers/react/sessions";
import type { SessionId } from "convex-helpers/server/sessions";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import {
  SidebarGroup,
  SidebarGroupButton,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/layout/sidebar";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePublicEnv } from "@/env/index.js";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

type ThreadRow = {
  _id: string;
  _creationTime: number;
  title?: string;
};

const listRecentThreadsQuery = api.chat.threads.listRecentThreads as FunctionReference<
  "query",
  "public",
  { sessionId: SessionId; token: string; paginationOpts: PaginationOptions },
  PaginationResult<ThreadRow>
>;

function ChatThreadHistoryList({ onNavigate }: { onNavigate?: () => void }) {
  const { accountToken: token } = usePublicEnv();
  const paginated = useSessionPaginatedQuery(
    listRecentThreadsQuery,
    token ? { token } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  if (!token) return null;
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
            <a
              href={`/chat?thread=${encodeURIComponent(row._id)}`}
              onClick={onNavigate}
              className="block min-w-0 truncate"
            >
              {row.title?.trim() || "Untitled"}
            </a>
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
  current: "context" | "chat";
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
  current: "context" | "chat";
  onNavigate?: () => void;
  className?: string;
  forceExpanded?: boolean;
}) {
  const { isExpanded } = useSidebar();
  const showText = forceExpanded || isExpanded;
  const go = () => {
    onNavigate?.();
  };

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
              <a href="/chat?new=1" onClick={go} aria-label="New chat">
                <PlusIcon className="size-4" />
              </a>
            </SidebarGroupButton>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarGroupButton
              collapsed
              variant={current === "context" ? "secondary" : "ghost"}
              asChild
            >
              <a href="/context" onClick={go} aria-label="Memories">
                <BookOpenIcon className="size-4" />
              </a>
            </SidebarGroupButton>
          </TooltipTrigger>
          <TooltipContent side="right">Memories</TooltipContent>
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
            <a href="/chat?new=1" onClick={go} className="flex items-center gap-2">
              <PlusIcon className="size-4 shrink-0" />
              Chat
            </a>
          </SidebarGroupButton>
          <ChatThreadHistoryList onNavigate={onNavigate} />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarGroupButton
            variant={current === "context" ? "secondary" : "ghost"}
            asChild
          >
            <a href="/context" onClick={go} className="flex items-center gap-2">
              <BookOpenIcon className="size-4 shrink-0" />
              Memories
            </a>
          </SidebarGroupButton>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
