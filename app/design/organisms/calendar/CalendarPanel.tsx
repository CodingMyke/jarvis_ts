"use client";

import { CalendarDayGroup } from "@/app/design/organisms/calendar/CalendarDayGroup";
import { CalendarPanelProvider } from "@/app/design/organisms/calendar/CalendarPanelContext";
import { useCalendarPanelContext } from "@/app/design/organisms/calendar/useCalendarPanelContext";
import { useCalendarPanelScroll } from "@/app/design/organisms/calendar/useCalendarPanelScroll";
import type { DeleteCalendarEventHandler } from "@/app/_features/calendar";
import { useCalendarStore } from "@/app/_features/calendar/state/calendar.store";

interface CalendarPanelContentProps {
  onDeleteEvent?: DeleteCalendarEventHandler;
}

function CalendarPanelContent({
  onDeleteEvent,
}: CalendarPanelContentProps) {
  const days = useCalendarStore((state) => state.days);
  const { visibleExpandedEventId } = useCalendarPanelContext();
  const { containerRef, contentRef, scrollOffset } =
    useCalendarPanelScroll(visibleExpandedEventId);

  if (days.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`mt-4 max-h-[calc(100vh-100px)] ${scrollOffset > 0 ? "events-fade-top" : ""}`}
      style={{ clipPath: "inset(0 -10rem 0 0)" }}
    >
      <div
        ref={contentRef}
        className="max-w-sm space-y-4 pr-2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        {days.map((day, index) => (
          <div key={day.dateISO}>
            {index > 0 ? <div className="mb-4 border-t border-white/10" /> : null}
            <CalendarDayGroup day={day} onDeleteEvent={onDeleteEvent} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CalendarPanelProps {
  onDeleteEvent?: DeleteCalendarEventHandler;
}

export function CalendarPanel({
  onDeleteEvent,
}: CalendarPanelProps) {
  const days = useCalendarStore((state) => state.days);

  if (days.length === 0) {
    return null;
  }

  return (
    <CalendarPanelProvider days={days}>
      <CalendarPanelContent onDeleteEvent={onDeleteEvent} />
    </CalendarPanelProvider>
  );
}
