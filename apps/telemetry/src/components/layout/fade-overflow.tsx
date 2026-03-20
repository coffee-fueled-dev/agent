"use client";

import { useEffect, useRef, useState } from "react";
import type { ClassNameValue } from "tailwind-merge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "../ui/scroll-area";

export function FadeOverflow({
  children,
  orientation = "vertical",
  className,
}: {
  children: React.ReactNode;
  orientation?: "vertical" | "horizontal";
  className?: ClassNameValue;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateFadeMasks = () => {
      if (orientation === "vertical") {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const hasOverflow = scrollHeight > clientHeight;
        const threshold = 1; // Small threshold to handle rounding errors

        // Show top fade when content is scrolled down (there's content above visible area)
        const isOverflowingTop = hasOverflow && scrollTop > threshold;

        // Show bottom fade when content extends beyond visible bottom
        const isOverflowingBottom =
          hasOverflow && scrollTop + clientHeight < scrollHeight - threshold;

        setShowTopFade(isOverflowingTop);
        setShowBottomFade(isOverflowingBottom);
      } else if (orientation === "horizontal") {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        const hasOverflow = scrollWidth > clientWidth;
        const threshold = 1; // Small threshold to handle rounding errors

        // Show left fade when content is scrolled right (there's content to the left)
        const isOverflowingLeft = hasOverflow && scrollLeft > threshold;

        // Show right fade when content extends beyond visible right
        const isOverflowingRight =
          hasOverflow && scrollLeft + clientWidth < scrollWidth - threshold;

        setShowLeftFade(isOverflowingLeft);
        setShowRightFade(isOverflowingRight);
      }
    };

    // Initial check with requestAnimationFrame to ensure content is rendered
    const rafId = requestAnimationFrame(() => {
      updateFadeMasks();
      // Also check after a short delay to catch any async content
      setTimeout(updateFadeMasks, 100);
    });

    container.addEventListener("scroll", updateFadeMasks);
    const resizeObserver = new ResizeObserver(updateFadeMasks);
    resizeObserver.observe(container);

    // Also observe content changes
    const mutationObserver = new MutationObserver(updateFadeMasks);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", updateFadeMasks);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [orientation]);

  return (
    <ScrollArea
      orientation={orientation}
      viewportRef={scrollContainerRef}
      className={cn(className)}
      viewportClassName={cn(
        orientation === "vertical" &&
          showTopFade &&
          showBottomFade &&
          "fade-mask-y",
        orientation === "vertical" &&
          showTopFade &&
          !showBottomFade &&
          "fade-mask-t",
        orientation === "vertical" &&
          !showTopFade &&
          showBottomFade &&
          "fade-mask-b",
        orientation === "horizontal" &&
          showLeftFade &&
          showRightFade &&
          "fade-mask-x",
        orientation === "horizontal" &&
          showLeftFade &&
          !showRightFade &&
          "fade-mask-l",
        orientation === "horizontal" &&
          !showLeftFade &&
          showRightFade &&
          "fade-mask-r",
      )}
    >
      {children}
    </ScrollArea>
  );
}
