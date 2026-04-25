"use client";

import type { UIDayEvents } from "@/app/_features/calendar";
import { CalendarPanel } from "@/app/design/organisms/calendar/CalendarPanel";
import { useDashboardCalendarWorkspace } from "./useDashboardCalendarWorkspace";

interface DashboardCalendarTemplateProps {
  initialEvents: UIDayEvents[];
  initialLoadError: boolean;
}

export function DashboardCalendarTemplate({
  initialEvents,
  initialLoadError,
}: DashboardCalendarTemplateProps) {
  const {
    days,
    hasLoadError,
    onDeleteEvent,
  } = useDashboardCalendarWorkspace({
    initialEvents,
    initialLoadError,
  });
  const hasEvents = days.some((day) => day.events.length > 0);

  return (
    <section className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Eventi</h2>
      {hasEvents ? (
        <CalendarPanel onDeleteEvent={onDeleteEvent} />
      ) : (
        <p className="text-sm text-muted">
          {hasLoadError ? "Si è verificato un errore" : "Nessun evento nei prossimi 7 giorni"}
        </p>
      )}
    </section>
  );
}
