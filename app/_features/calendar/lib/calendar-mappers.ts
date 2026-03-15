import type { CalendarEvent } from "@/app/_features/calendar/types";
import type { UICalendarEvent, UIDayEvents } from "@/app/_features/calendar/lib/actions";

export interface CalendarApiEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

type CalendarLikeEvent = CalendarEvent | CalendarApiEvent;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatCalendarTime(date: Date): string {
  return date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toUICalendarEvent(event: CalendarLikeEvent): UICalendarEvent {
  const startTime = toDate(event.startTime);
  const endTime = event.endTime ? toDate(event.endTime) : undefined;

  return {
    id: event.id,
    title: event.title,
    time: formatCalendarTime(startTime),
    endTime: endTime ? formatCalendarTime(endTime) : undefined,
    color: event.color,
    description: event.description,
    location: event.location,
    attendees: event.attendees,
  };
}

export function groupCalendarEventsByDay(events: CalendarLikeEvent[]): UIDayEvents[] {
  const grouped = new Map<string, UICalendarEvent[]>();

  for (const event of events) {
    const dateKey = toDate(event.startTime).toISOString().split("T")[0];
    const currentEvents = grouped.get(dateKey) ?? [];
    grouped.set(dateKey, [...currentEvents, toUICalendarEvent(event)]);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateISO, dayEvents]) => ({
      dateISO,
      events: dayEvents,
    }));
}
