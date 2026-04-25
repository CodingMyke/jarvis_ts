import type { UICalendarEvent } from "@/app/_features/calendar";

interface EventItemHeaderProps {
  event: UICalendarEvent;
  isExpanded: boolean;
}

export function EventItemHeader({
  event,
  isExpanded,
}: EventItemHeaderProps) {
  return (
    <div
      className={`transition-[opacity,gap] duration-(--transition-medium) ease-(--easing-smooth) ${
        isExpanded ? "flex flex-col gap-1.5" : "flex flex-col gap-1"
      }`}
    >
      <span
        className={`shrink-0 text-muted transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
          isExpanded ? "text-sm font-medium tracking-wide text-muted/90" : "text-xs text-muted/80"
        }`}
      >
        {event.time}
        {event.endTime ? ` - ${event.endTime}` : ""}
      </span>
      <span
        className={`text-foreground transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
          isExpanded ? "text-lg font-semibold leading-tight" : "block truncate text-base font-medium"
        }`}
      >
        {event.title}
      </span>
    </div>
  );
}
