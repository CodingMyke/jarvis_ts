"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { DayEvents, type DayEventsData } from "@/app/components/molecules/DayEvents";

// Stima l'altezza extra necessaria quando un evento si espande
const EXPANSION_HEIGHT_ESTIMATE = 180; // px - copre descrizione lunga + location + attendees + padding

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
    // Se nessun evento è espanso, torna a offset 0
    if (!expandedEventId) {
      setScrollOffset(0);
      return;
    }

    if (!containerRef.current || !contentRef.current) return;

    const expandedElement = contentRef.current.querySelector(
      `[data-event-id="${expandedEventId}"]`
    ) as HTMLElement | null;
    
    if (!expandedElement) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = expandedElement.getBoundingClientRect();
    
    // Compensa per l'offset attuale (il transform sposta visivamente gli elementi)
    // Aggiungiamo l'offset corrente per ottenere la posizione "originale"
    const originalBottom = elementRect.bottom + currentOffsetRef.current;
    
    // Calcola quanto spazio servirà: posizione originale + altezza stimata espansione
    const estimatedFinalBottom = originalBottom + EXPANSION_HEIGHT_ESTIMATE;
    const overflow = estimatedFinalBottom - containerRect.bottom;
    
    // Se serve scroll lo applica, altrimenti resetta a 0
    setScrollOffset(overflow > 0 ? overflow : 0);
  }, [expandedEventId]);

  return { containerRef, contentRef, scrollOffset };
}

// Crea una data stabile (solo giorno, senza ore/minuti/secondi)
function createStableDate(daysOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Fake data per testing UI
function useFakeEvents(): DayEventsData[] {
  return useMemo(() => {
    const today = createStableDate(0);
    const tomorrow = createStableDate(1);
    const dayAfter = createStableDate(3);

    const fakeEvents: DayEventsData[] = [
      {
        date: today,
        events: [
          {
            id: "1",
            title: "Daily standup",
            time: "09:30",
            endTime: "10:00",
            color: "#4285f4",
            description: "Sincronizzazione giornaliera del team di sviluppo",
          },
          {
            id: "2",
            title: "Pranzo con Marco per discutere del nuovo progetto di intelligenza artificiale",
            time: "13:00",
            color: "#34a853",
            description: "Portare i documenti del contratto.",
            location: "Ristorante Da Luigi, Via Roma 42",
            attendees: ["Marco Rossi", "Giulia Bianchi"],
          },
        ],
      },
      {
        date: tomorrow,
        events: [
          {
            id: "3",
            title: "Review del progetto",
            time: "11:00",
            endTime: "12:00",
            color: "#ea4335",
            description: "Presentazione dello stato di avanzamento al product owner",
          },
          {
            id: "4",
            title: "Call con cliente internazionale per la definizione dei requisiti della fase 2",
            time: "15:30",
            endTime: "16:00",
            color: "#fbbc04",
            description: "Link Zoom nel calendario. Preparare slides con mockup.",
            location: "Zoom Meeting",
            attendees: ["John Smith", "Sarah Johnson", "Marco Rossi"],
          },
          {
            id: "5",
            title: "Palestra",
            time: "19:00",
            color: "#9c27b0",
          },
        ],
      },
      {
        date: dayAfter,
        events: [
          {
            id: "6",
            title: "Dentista",
            time: "10:00",
            color: "#00bcd4",
            description: "Controllo semestrale e pulizia dei denti. Ricordarsi di portare la tessera sanitaria e i referti delle ultime radiografie panoramiche. Chiedere al dottore informazioni sulla possibilità di installare un apparecchio invisibile per correggere il leggero disallineamento dei denti anteriori.",
            location: "Studio Dentistico Bianchi",
          },
        ],
      },
    ];

    return fakeEvents.filter((day) => day.events.length > 0);
  }, []);
}

export function UpcomingEvents() {
  const days = useFakeEvents();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const { containerRef, contentRef, scrollOffset } = useEventsScroll(expandedEventId);

  const handleToggleEvent = useCallback((eventId: string) => {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
  }, []);

  if (days.length === 0) return null;

  const isScrolled = scrollOffset > 0;

  return (
    <div
      ref={containerRef}
      className={`
        mt-12 max-w-xs
        max-h-[calc(100vh-220px)] overflow-hidden
        ${isScrolled ? "events-fade-top" : ""}
      `}
    >
      <div
        ref={contentRef}
        className="space-y-4 pr-2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {days.map((dayData) => (
          <DayEvents
            key={dayData.date.toISOString()}
            data={dayData}
            expandedEventId={expandedEventId}
            onToggleEvent={handleToggleEvent}
          />
        ))}
      </div>
    </div>
  );
}
