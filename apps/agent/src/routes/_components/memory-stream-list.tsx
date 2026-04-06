"use client";

import { api } from "@agent/backend/api";
import {
  useSessionIdArg,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { Trash2Icon } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FadeOverflow } from "@/components/layout/fade-overflow";
import LoadMoreSentinel from "@/components/layout/load-more-sentinel";
import { RequiredPaginatedResult } from "@/components/layout/required-result";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.js";
import { Button } from "@/components/ui/button.js";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@/components/ui/empty.js";
import { Item, ItemHeader, ItemTitle } from "@/components/ui/item";
import { estimateMemoryTextBlockHeight } from "./memory-row-pretext.js";

const PAGE_SIZE = 25;

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

function MemoryRowPage({
  row,
  selected,
  onToggleSelected,
}: {
  row: MemoryListRow;
  selected: boolean;
  onToggleSelected: (id: string) => void;
}) {
  const title = row.title?.trim();
  const primary = title || row.key;
  const secondaryText = title && row.key !== title ? row.key : null;

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

  const textBlockMinHeight = useMemo(
    () => estimateMemoryTextBlockHeight(primary, secondaryText, textWidth),
    [primary, secondaryText, textWidth],
  );

  return (
    <Item size="sm" className="gap-2">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected(row._id)}
          className="size-4 shrink-0 accent-primary"
          aria-label={`Select ${primary}`}
        />
      </label>
      <ItemHeader className="min-w-0 min-h-0 flex-1 items-start gap-2">
        <div
          ref={textColRef}
          className="min-w-0 flex-1 flex flex-col gap-0.5"
          style={
            textBlockMinHeight > 0
              ? { minHeight: textBlockMinHeight }
              : undefined
          }
        >
          <ItemTitle className="w-full min-w-0 max-w-full text-xs leading-4 font-medium break-words">
            {primary}
          </ItemTitle>
          {secondaryText ? (
            <span className="text-muted-foreground min-w-0 max-w-full break-words text-xs leading-4">
              {secondaryText}
            </span>
          ) : null}
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-[10px] leading-[14px] tabular-nums">
          {new Date(row._creationTime).toLocaleString()}
        </span>
      </ItemHeader>
    </Item>
  );
}

function MemoryListPage({
  results,
  loadMore,
  canLoadMore,
  isLoadingMore,
  userId,
}: {
  results: MemoryListRow[];
  loadMore: (n: number) => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  userId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deleteMemoriesBatch = useSessionMutation(
    api.memories.deleteMemoriesBatch.deleteMemoriesBatch,
  );

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected =
    results.length > 0 && results.every((r) => selected.has(r._id));

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (results.length > 0 && results.every((r) => prev.has(r._id))) {
        return new Set();
      }
      return new Set(results.map((r) => r._id));
    });
  }, [results]);

  const confirmDelete = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    await deleteMemoriesBatch({
      userId,
      memoryRecordIds: ids,
    });
    setSelected(new Set());
    setConfirmOpen(false);
  }, [deleteMemoriesBatch, selected, userId]);

  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 px-8 pb-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="size-4 shrink-0 accent-primary"
            aria-label="Select all loaded memories"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={selected.size === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon className="size-3.5" />
          Delete
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {selected.size === 1
                ? "this memory"
                : `${selected.size} memories`}{" "}
              and all associated search indexes and files. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FadeOverflow
        viewportRef={viewportRef}
        className="h-full min-h-0 flex-1 px-8"
      >
        <div className="flex flex-col gap-2 pr-2 w-full max-w-4xl">
          {results.map((row) => (
            <MemoryRowPage
              key={row._id}
              row={row}
              selected={selected.has(row._id)}
              onToggleSelected={toggleSelected}
            />
          ))}
        </div>
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

        if (results.length > 0 && userId) {
          return (
            <MemoryListPage
              results={results as MemoryListRow[]}
              loadMore={loadMore}
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              userId={userId}
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
