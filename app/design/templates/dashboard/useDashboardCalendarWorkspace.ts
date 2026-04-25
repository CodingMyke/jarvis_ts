"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteCalendarEvent } from "@/app/_features/calendar/lib/calendar-client";
import type { DeleteCalendarEventHandler, UIDayEvents } from "@/app/_features/calendar";
import { initializeCalendarStore, useCalendarStore } from "@/app/_features/calendar/state/calendar.store";

interface UseDashboardCalendarWorkspaceOptions {
  initialEvents: UIDayEvents[];
  initialLoadError: boolean;
}

interface UseDashboardCalendarWorkspaceResult {
  days: UIDayEvents[];
  hasLoadError: boolean;
  onDeleteEvent: DeleteCalendarEventHandler;
}

export function useDashboardCalendarWorkspace({
  initialEvents,
  initialLoadError,
}: UseDashboardCalendarWorkspaceOptions): UseDashboardCalendarWorkspaceResult {
  const days = useCalendarStore((state) => state.days);
  const status = useCalendarStore((state) => state.status);
  const refreshCalendar = useCalendarStore((state) => state.refresh);
  const applyCalendarMutationResult = useCalendarStore(
    (state) => state.applyEventMutationResult,
  );
  const [hasLoadError, setHasLoadError] = useState(initialLoadError);

  useEffect(() => {
    initializeCalendarStore(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    setHasLoadError(initialLoadError);
  }, [initialLoadError]);

  useEffect(() => {
    if (status === "error") {
      setHasLoadError(true);
      return;
    }

    if (status === "ready") {
      setHasLoadError(false);
    }
  }, [status]);

  const onDeleteEvent = useCallback<DeleteCalendarEventHandler>(
    async (eventId) => {
      const result = await deleteCalendarEvent({ eventId });

      if (!result.success) {
        return {
          success: false,
          errorMessage: result.errorMessage,
        };
      }

      applyCalendarMutationResult({ removedEventId: eventId });

      setTimeout(() => {
        void refreshCalendar();
      }, 500);

      return { success: true };
    },
    [applyCalendarMutationResult, refreshCalendar],
  );

  return {
    days,
    hasLoadError,
    onDeleteEvent,
  };
}
