"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const EXPANSION_HEIGHT_ESTIMATE = 80;

export function useCalendarPanelScroll(expandedEventId: string | null): {
  containerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  scrollOffset: number;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const currentOffsetRef = useRef(0);

  useEffect(() => {
    currentOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  useEffect(() => {
    let frameId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!expandedEventId) {
      frameId = requestAnimationFrame(() => {
        setScrollOffset(0);
      });

      return () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
      };
    }

    const calculateScroll = () => {
      if (!expandedEventId || !containerRef.current || !contentRef.current) {
        return;
      }

      const expandedElement = contentRef.current.querySelector(
        `[data-event-id="${expandedEventId}"]`,
      ) as HTMLElement | null;

      if (!expandedElement) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = expandedElement.getBoundingClientRect();
      const originalTop = elementRect.top + currentOffsetRef.current;
      const originalBottom = elementRect.bottom + currentOffsetRef.current;
      const viewportBottom = window.innerHeight - 100;
      const spaceBelow = viewportBottom - originalBottom;

      if (spaceBelow >= EXPANSION_HEIGHT_ESTIMATE) {
        setScrollOffset(0);
        return;
      }

      const overflow = EXPANSION_HEIGHT_ESTIMATE - spaceBelow;
      const maxScroll = originalTop - containerRect.top;
      const nextOffset = Math.max(0, Math.min(overflow, maxScroll));
      setScrollOffset(nextOffset);
    };

    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(() => {
        timeoutId = setTimeout(calculateScroll, 50);
      });
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [expandedEventId]);

  return { containerRef, contentRef, scrollOffset };
}
