import { CalendarEventCard } from "@/app/design/organisms/calendar/CalendarEventCard";
import type { DeleteCalendarEventHandler, UIDayEvents } from "@/app/_features/calendar";

interface CalendarDayGroupProps {
  day: UIDayEvents;
  onDeleteEvent?: DeleteCalendarEventHandler;
}

function formatDayLabel(dateIso: string): string {
  const date = new Date(dateIso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Oggi";
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return "Domani";
  }

  const weekday = date.toLocaleDateString("it-IT", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("it-IT", { month: "short" });

  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`;
}

export function CalendarDayGroup({
  day,
  onDeleteEvent,
}: CalendarDayGroupProps) {
  if (day.events.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted/80">
        {formatDayLabel(day.dateISO)}
      </h3>
      <div className="mt-3 space-y-2">
        {day.events.map((event) => (
          <CalendarEventCard key={event.id} event={event} onDeleteEvent={onDeleteEvent} />
        ))}
      </div>
    </div>
  );
}
