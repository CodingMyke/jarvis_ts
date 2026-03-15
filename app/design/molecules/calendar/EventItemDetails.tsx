import type { UICalendarEvent } from "@/app/_features/calendar";

interface EventItemDetailsProps {
  event: UICalendarEvent;
  isExpanded: boolean;
}

export function EventItemDetails({
  event,
  isExpanded,
}: EventItemDetailsProps) {
  return (
    <>
      {event.description ? (
        <p
          className={`text-muted/80 transition-[font-size,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
            isExpanded ? "mt-3 text-base line-clamp-none" : "mt-0.5 text-sm line-clamp-2"
          }`}
        >
          {event.description}
        </p>
      ) : null}

      <div
        className={`overflow-hidden transition-[max-height,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
          isExpanded ? "mt-2 max-h-40 opacity-100" : "mt-0 max-h-0 opacity-0"
        }`}
      >
        {event.location ? (
          <div className="mb-1 flex items-center gap-2 text-sm text-muted/70">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        ) : null}

        {event.attendees && event.attendees.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted/70">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <span>{event.attendees.join(", ")}</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
