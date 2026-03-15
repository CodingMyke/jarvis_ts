"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

export function useCalendarEventCardInteractions(
  eventId: string,
  isExpanded: boolean,
  isDeleteDialogVisible: boolean,
  onToggle: (eventId: string) => void,
): {
  containerRef: RefObject<HTMLDivElement | null>;
  handleMouseDown: () => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleClick: () => void;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);

  const handleMouseDown = useCallback(() => {
    pressedRef.current = true;
    containerRef.current?.classList.add("event-pressed");
  }, []);

  const handleMouseUp = useCallback(() => {
    pressedRef.current = false;
    containerRef.current?.classList.remove("event-pressed");
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      containerRef.current?.classList.remove("event-pressed");
    }
  }, []);

  const handleClick = useCallback(() => {
    onToggle(eventId);
  }, [eventId, onToggle]);

  useEffect(() => {
    if (!isExpanded || isDeleteDialogVisible) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (target.closest?.(".event-item-container")) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        onToggle(eventId);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [eventId, isDeleteDialogVisible, isExpanded, onToggle]);

  return {
    containerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleClick,
  };
}
