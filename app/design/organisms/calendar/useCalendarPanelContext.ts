"use client";

import { useContext, type ContextType } from "react";
import { CalendarPanelContext } from "./CalendarPanelContext";

export function useCalendarPanelContext(): NonNullable<
  ContextType<typeof CalendarPanelContext>
> {
  const context = useContext(CalendarPanelContext);

  if (!context) {
    throw new Error("useCalendarPanelContext must be used within CalendarPanelProvider");
  }

  return context;
}
