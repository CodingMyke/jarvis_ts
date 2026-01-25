"use client";

import { useRef, useEffect, useCallback } from "react";

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

interface EventItemProps {
  event: CalendarEvent;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function useEventItem(
  event: CalendarEvent,
  isExpanded: boolean,
  onToggle: (id: string) => void
) {
  const collapsedRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);

  const getActiveRef = useCallback(() => {
    return isExpanded ? expandedRef : collapsedRef;
  }, [isExpanded]);

  const handleMouseDown = useCallback(() => {
    pressedRef.current = true;
    getActiveRef().current?.classList.add("event-pressed");
  }, [getActiveRef]);

  const handleMouseUp = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      getActiveRef().current?.classList.remove("event-pressed");
      onToggle(event.id);
    }
  }, [event.id, onToggle, getActiveRef]);

  const handleMouseLeave = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      getActiveRef().current?.classList.remove("event-pressed");
    }
  }, [getActiveRef]);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (expandedRef.current && !expandedRef.current.contains(e.target as Node)) {
        onToggle(event.id);
      }
    };

    // Delay per evitare che il click di apertura chiuda subito
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, event.id, onToggle]);

  return {
    collapsedRef,
    expandedRef,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
  };
}

export function EventItem({ event, isExpanded, onToggle }: EventItemProps) {
  const accentColor = event.color || "var(--accent)";
  const { collapsedRef, expandedRef, handleMouseDown, handleMouseUp, handleMouseLeave } =
    useEventItem(event, isExpanded, onToggle);

  const collapsedContent = (
    <div className="flex gap-3">
      <div
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs text-muted">
            {event.time}
            {event.endTime && ` - ${event.endTime}`}
          </span>
          <span className="truncate text-sm text-foreground">{event.title}</span>
        </div>
        {event.description && (
          <p className="mt-0.5 text-xs text-muted/70 line-clamp-2">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );

  const expandedContent = (
    <div className="flex gap-3">
      <div
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1">
          <span className="shrink-0 text-sm font-medium text-muted">
            {event.time}
            {event.endTime && ` - ${event.endTime}`}
          </span>
          <span className="text-base font-semibold text-foreground">
            {event.title}
          </span>
        </div>

        <div className="mt-3">
          {event.description && (
            <p className="text-sm text-muted/80 mb-2">{event.description}</p>
          )}

          {event.location && (
            <div className="flex items-center gap-2 text-xs text-muted/70 mb-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{event.location}</span>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted/70">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
              <span>{event.attendees.join(", ")}</span>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-white/10">
            <span className="text-[10px] text-muted/50 font-mono">
              ID: {event.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Elemento base che mantiene lo spazio nel layout */}
      <div
        ref={collapsedRef}
        className={`
          event-item cursor-pointer select-none
          transition-all duration-(--transition-fast) ease-(--easing-standard)
          ${isExpanded ? "opacity-0 pointer-events-none" : ""}
        `}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {collapsedContent}
      </div>

      {/* Card espansa in overlay */}
      <div
        ref={expandedRef}
        className={`
          absolute top-0 left-0 right-0 z-50
          event-card-expanded rounded-xl p-4 -mx-2
          cursor-pointer select-none
          transition-all duration-(--transition-fast) ease-(--easing-standard)
          ${isExpanded 
            ? "opacity-100 scale-100 pointer-events-auto" 
            : "opacity-0 scale-95 pointer-events-none"
          }
        `}
        onMouseDown={isExpanded ? handleMouseDown : undefined}
        onMouseUp={isExpanded ? handleMouseUp : undefined}
        onMouseLeave={isExpanded ? handleMouseLeave : undefined}
        onTouchStart={isExpanded ? handleMouseDown : undefined}
        onTouchEnd={isExpanded ? handleMouseUp : undefined}
      >
        {expandedContent}
      </div>
    </div>
  );
}
