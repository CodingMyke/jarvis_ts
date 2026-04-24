"use client";

import { createContext, useMemo, useState, type ReactNode } from "react";
import type { UIDayEvents } from "@/app/_features/calendar";

interface CalendarPanelContextValue {
  expandedEventId: string | null;
  visibleExpandedEventId: string | null;
  toggleEvent: (eventId: string) => void;
  collapseEvent: (eventId?: string) => void;
}

export const CalendarPanelContext = createContext<CalendarPanelContextValue | null>(null);

interface CalendarPanelProviderProps {
  days: UIDayEvents[];
  children: ReactNode;
}

export function CalendarPanelProvider({
  days,
  children,
}: CalendarPanelProviderProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const visibleExpandedEventId = useMemo(() => {
    if (!expandedEventId) {
      return null;
    }

    const hasExpandedEvent = days.some((day) =>
      day.events.some((event) => event.id === expandedEventId),
    );

    return hasExpandedEvent ? expandedEventId : null;
  }, [days, expandedEventId]);

  const value = useMemo<CalendarPanelContextValue>(
    () => ({
      expandedEventId,
      visibleExpandedEventId,
      toggleEvent: (eventId) => {
        setExpandedEventId((current) => (current === eventId ? null : eventId));
      },
      collapseEvent: (eventId) => {
        setExpandedEventId((current) => {
          if (!eventId || current === eventId) {
            return null;
          }

          return current;
        });
      },
    }),
    [expandedEventId, visibleExpandedEventId],
  );

  return (
    <CalendarPanelContext.Provider value={value}>
      {children}
    </CalendarPanelContext.Provider>
  );
}
