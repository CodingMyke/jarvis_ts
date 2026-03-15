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
        isExpanded ? "flex flex-col gap-1" : "flex items-baseline gap-2"
      }`}
    >
      <span
        className={`shrink-0 text-muted transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
          isExpanded ? "text-base font-medium" : "text-sm"
        }`}
      >
        {event.time}
        {event.endTime ? ` - ${event.endTime}` : ""}
      </span>
      <span
        className={`text-foreground transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
          isExpanded ? "text-lg font-semibold" : "truncate text-base"
        }`}
      >
        {event.title}
      </span>
    </div>
  );
}
