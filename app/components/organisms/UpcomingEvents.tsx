"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  DayEvents,
  type DayEventsData,
} from "@/app/components/molecules/DayEvents";
import type { UIDayEvents } from "@/app/lib/calendar/actions";

// Stima l'altezza extra necessaria quando un evento si espande
const EXPANSION_HEIGHT_ESTIMATE = 80; // px - margine minimo per l'espansione

function useEventsScroll(expandedEventId: string | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const currentOffsetRef = useRef(0);

  // Mantieni il ref sincronizzato con lo state
  useEffect(() => {
    currentOffsetRef.current = scrollOffset;
  }, [scrollOffset]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      // Se nessun evento è espanso, torna a offset 0
      if (!expandedEventId) {
        setScrollOffset(0);
        return;
      }

      if (!containerRef.current || !contentRef.current) return;

      const expandedElement = contentRef.current.querySelector(
        `[data-event-id="${expandedEventId}"]`,
      ) as HTMLElement | null;

      if (!expandedElement) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = expandedElement.getBoundingClientRect();

      // Compensa per l'offset attuale (il transform sposta visivamente gli elementi)
      const originalTop = elementRect.top + currentOffsetRef.current;
      const originalBottom = elementRect.bottom + currentOffsetRef.current;

      // Usa il viewport per calcolare lo spazio disponibile (con margine di 100px dal fondo)
      const viewportBottom = window.innerHeight - 100;
      const spaceBelow = viewportBottom - originalBottom;

      // Se c'è abbastanza spazio per l'espansione, non serve scroll
      if (spaceBelow >= EXPANSION_HEIGHT_ESTIMATE) {
        setScrollOffset(0);
        return;
      }

      // Calcola quanto scroll serve per mostrare l'espansione
      const overflow = EXPANSION_HEIGHT_ESTIMATE - spaceBelow;

      // Limita lo scroll: l'elemento non deve mai scomparire sopra il container
      const maxScroll = originalTop - containerRect.top;

      // Applica lo scroll minimo necessario
      setScrollOffset(Math.min(overflow, maxScroll));
    });

    return () => cancelAnimationFrame(frameId);
  }, [expandedEventId]);

  return { containerRef, contentRef, scrollOffset };
}

/**
 * Props per il componente UpcomingEvents.
 */
interface UpcomingEventsProps {
  /** Eventi raggruppati per giorno (da SSR) */
  initialEvents?: UIDayEvents[];
}

/**
 * Converte UIDayEvents (serializzabile) in DayEventsData (con Date).
 */
function toDayEventsData(uiDays: UIDayEvents[]): DayEventsData[] {
  return uiDays.map((day) => ({
    date: new Date(day.dateISO),
    events: day.events,
  }));
}

export function UpcomingEvents({ initialEvents = [] }: UpcomingEventsProps) {
  const days = useMemo(() => toDayEventsData(initialEvents), [initialEvents]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const { containerRef, contentRef, scrollOffset } =
    useEventsScroll(expandedEventId);

  const handleToggleEvent = useCallback((eventId: string) => {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
  }, []);

  if (days.length === 0) return null;

  const isScrolled = scrollOffset > 0;

  return (
    <div
      ref={containerRef}
      className={`
        mt-4
        max-h-[calc(100vh-100px)]
        ${isScrolled ? "events-fade-top" : ""}
      `}
      style={{ clipPath: "inset(0 -10rem 0 0)" }}
    >
      <div
        ref={contentRef}
        className="space-y-4 pr-2 max-w-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {days.map((dayData, index) => (
          <div key={dayData.date.toISOString()}>
            {index > 0 && <div className="mb-4 border-t border-white/10" />}
            <DayEvents
              data={dayData}
              expandedEventId={expandedEventId}
              onToggleEvent={handleToggleEvent}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
