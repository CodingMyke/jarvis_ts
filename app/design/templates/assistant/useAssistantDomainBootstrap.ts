"use client";

import { useEffect } from "react";
import type { UIDayEvents } from "@/app/_features/calendar";
import { initializeCalendarStore } from "@/app/_features/calendar/state/calendar.store";
import type { Todo } from "@/app/_features/tasks/types";
import { initializeTasksStore } from "@/app/_features/tasks/state/tasks.store";
import { ensureTimerStoreSubscription } from "@/app/_features/timer/state/timer.store";

interface UseAssistantDomainBootstrapOptions {
  initialEvents: UIDayEvents[];
  initialTodos: Todo[];
}

export function useAssistantDomainBootstrap({
  initialEvents,
  initialTodos,
}: UseAssistantDomainBootstrapOptions): void {
  useEffect(() => {
    initializeCalendarStore(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    initializeTasksStore(initialTodos);
  }, [initialTodos]);

  useEffect(() => {
    ensureTimerStoreSubscription();
  }, []);
}
