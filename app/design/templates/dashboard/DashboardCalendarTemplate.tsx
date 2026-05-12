"use client";

import type { UIDayEvents } from "@/app/_features/calendar";
import { CalendarPanel } from "@/app/design/organisms/calendar/CalendarPanel";
import { AppPanel, EmptyState, SectionHeader } from "@/app/_shared/ui";
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
    <AppPanel as="section" className="w-full space-y-3 p-4">
      <SectionHeader title="Eventi" />
      {hasEvents ? (
        <CalendarPanel onDeleteEvent={onDeleteEvent} />
      ) : (
        <EmptyState
          description={hasLoadError ? "Si è verificato un errore" : "Nessun evento nei prossimi 7 giorni"}
          variant={hasLoadError ? "error" : "default"}
        />
      )}
    </AppPanel>
  );
}
