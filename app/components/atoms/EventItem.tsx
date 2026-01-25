export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  color?: string;
  description?: string;
}

interface EventItemProps {
  event: CalendarEvent;
}

export function EventItem({ event }: EventItemProps) {
  const accentColor = event.color || "var(--accent)";

  return (
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
}
