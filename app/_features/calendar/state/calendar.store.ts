"use client";

import { create } from "zustand";
import { getCalendarEvents } from "@/app/_features/calendar/lib/calendar-client";
import { removeCalendarEventFromDays } from "@/app/_features/calendar/lib/ui-events";
import type { UIDayEvents } from "@/app/_features/calendar/lib/calendar-ui.types";

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

    const result = await getCalendarEvents({ daysAhead: 7 });

    if (result.success) {
      set(setReadyState(result.days));
      return result.days;
    }

    set((state) => ({
      ...state,
      status: "error",
      error: result.errorMessage,
      initialized: true,
    }));
    return get().days;
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
