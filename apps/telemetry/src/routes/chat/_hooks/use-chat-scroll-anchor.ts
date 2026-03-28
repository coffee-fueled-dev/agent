import { useCallback, useEffect, useRef, useState } from "react";

const ALIGN_PX = 14;

/**
 * "Pinned" when the last-pair wrapper is aligned to the top of the scroll viewport
 * (pair-at-top + flex spacer layout).
 */
export function useChatScrollAnchor({
  viewportRef,
  lastPairRef,
  messageCount,
  threadId,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  lastPairRef: React.RefObject<HTMLDivElement | null>;
  messageCount: number;
  threadId: string;
}) {
  const [pinnedToTail, setPinnedToTail] = useState(true);
  const suppressScrollRef = useRef(false);
  const prevCountRef = useRef(0);

  const scrollLastPairToTop = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const pair = lastPairRef.current;
      if (!pair) return;
      suppressScrollRef.current = true;
      pair.scrollIntoView({ block: "start", behavior });
      window.setTimeout(
        () => {
          suppressScrollRef.current = false;
        },
        behavior === "smooth" ? 400 : 50,
      );
    },
    [lastPairRef],
  );

  useEffect(() => {
    void threadId;
    prevCountRef.current = 0;
    setPinnedToTail(true);
  }, [threadId]);

  useEffect(() => {
    if (messageCount === 0) {
      prevCountRef.current = 0;
      return;
    }
    const grew = messageCount > prevCountRef.current;
    prevCountRef.current = messageCount;
    if (grew && pinnedToTail) {
      requestAnimationFrame(() => scrollLastPairToTop("auto"));
    }
  }, [messageCount, pinnedToTail, scrollLastPairToTop]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || messageCount === 0) return;

    const check = () => {
      if (suppressScrollRef.current) return;
      const pair = lastPairRef.current;
      if (!pair) return;
      const vpRect = vp.getBoundingClientRect();
      const pairRect = pair.getBoundingClientRect();
      const aligned = Math.abs(pairRect.top - vpRect.top) < ALIGN_PX;
      setPinnedToTail(aligned);
    };

    vp.addEventListener("scroll", check, { passive: true });
    return () => {
      vp.removeEventListener("scroll", check);
    };
  }, [viewportRef, lastPairRef, messageCount]);

  const scrollToTail = useCallback(() => {
    setPinnedToTail(true);
    scrollLastPairToTop("smooth");
  }, [scrollLastPairToTop]);

  return {
    pinnedToTail,
    showJumpToLatest: messageCount > 0 && !pinnedToTail,
    scrollToTail,
  };
}
