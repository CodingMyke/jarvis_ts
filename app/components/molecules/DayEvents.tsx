import { EventItem, type CalendarEvent } from "@/app/components/atoms/EventItem";

export interface DayEventsData {
  date: Date;
  events: CalendarEvent[];
}

interface DayEventsProps {
  data: DayEventsData;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Oggi";
  if (isTomorrow) return "Domani";

  const weekday = date.toLocaleDateString("it-IT", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("it-IT", { month: "short" });

  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month}`;
}

export function DayEvents({ data }: DayEventsProps) {
  const { date, events } = data;

  if (events.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
        {formatDayLabel(date)}
      </h3>
      <div className="space-y-1.5">
        {events.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
