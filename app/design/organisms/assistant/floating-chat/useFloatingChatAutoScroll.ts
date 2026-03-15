"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Message } from "@/app/_features/assistant/types/speech.types";

export function useFloatingChatAutoScroll(
  messages: Message[],
  isExpanded: boolean,
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isExpanded) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;

    let frameId: number | null = null;
    const startTime = Date.now();
    const duration = 1000;

    const scrollLoop = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        container.scrollTop = container.scrollHeight;
        frameId = requestAnimationFrame(scrollLoop);
      }
    };

    frameId = requestAnimationFrame(scrollLoop);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isExpanded]);

  return containerRef;
}
