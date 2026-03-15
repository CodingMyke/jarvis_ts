"use client";

import { create } from "zustand";
import { fetchCalendarEventsFromApi } from "@/app/_features/calendar/lib/calendar-client";
import { removeCalendarEventFromDays } from "@/app/_features/calendar/lib/ui-events";
import type { UIDayEvents } from "@/app/_features/calendar/lib/actions";

export type CalendarStoreStatus = "idle" | "loading" | "ready" | "error";

export interface CalendarMutationResult {
  days?: UIDayEvents[];
  removedEventId?: string;
}

interface CalendarStoreState {
  days: UIDayEvents[];
  status: CalendarStoreStatus;
  error: string | null;
  initialized: boolean;
  initialize: (days: UIDayEvents[]) => void;
  refresh: () => Promise<UIDayEvents[]>;
  removeEvent: (eventId: string) => void;
  applyEventMutationResult: (result: CalendarMutationResult) => void;
}

function setReadyState(days: UIDayEvents[]): Pick<
  CalendarStoreState,
  "days" | "status" | "error" | "initialized"
> {
  return {
    days,
    status: "ready",
    error: null,
    initialized: true,
  };
}

export const useCalendarStore = create<CalendarStoreState>((set, get) => ({
  days: [],
  status: "idle",
  error: null,
  initialized: false,
  initialize: (days) => {
    set(setReadyState(days));
  },
  refresh: async () => {
    set((state) => ({
      ...state,
      status: "loading",
      error: null,
    }));

    try {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const days = await fetchCalendarEventsFromApi({
        from: now,
        to: sevenDaysLater,
      });

      set(setReadyState(days));
      return days;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante il refresh del calendario.";

      set((state) => ({
        ...state,
        status: "error",
        error: message,
        initialized: true,
      }));
      return get().days;
    }
  },
  removeEvent: (eventId) => {
    set((state) => ({
      ...state,
      days: removeCalendarEventFromDays(state.days, eventId),
    }));
  },
  applyEventMutationResult: (result) => {
    if (result.days) {
      set(setReadyState(result.days));
      return;
    }

    if (result.removedEventId) {
      get().removeEvent(result.removedEventId);
    }
  },
}));

export function initializeCalendarStore(days: UIDayEvents[]): void {
  useCalendarStore.getState().initialize(days);
}
