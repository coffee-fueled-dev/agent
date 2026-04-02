"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

const ROOT_MARGIN = "100px"; // Trigger slightly before sentinel is visible

export interface LoadMoreSentinelProps {
  onLoadMore: () => void;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  scrollContainerSelector?: string;
}

export default function LoadMoreSentinel({
  onLoadMore,
  canLoadMore,
  isLoadingMore,
  scrollContainerSelector,
}: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = scrollContainerSelector
      ? (sentinel.closest(scrollContainerSelector) as Element)
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || !canLoadMore || isLoadingMore) return;
        onLoadMore();
      },
      { root, rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, canLoadMore, isLoadingMore, scrollContainerSelector]);

  if (!canLoadMore && !isLoadingMore) return null;

  return (
    <div ref={sentinelRef} className="flex justify-center py-4">
      {isLoadingMore && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
