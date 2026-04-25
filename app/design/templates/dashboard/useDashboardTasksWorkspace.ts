"use client";

import { useEffect, useState } from "react";
import type { Todo } from "@/app/_features/tasks";
import { initializeTasksStore, useTasksStore } from "@/app/_features/tasks";

interface UseDashboardTasksWorkspaceOptions {
  initialTodos: Todo[];
  initialLoadError: boolean;
}

interface UseDashboardTasksWorkspaceResult {
  todos: Todo[];
  hasLoadError: boolean;
}

export function useDashboardTasksWorkspace({
  initialTodos,
  initialLoadError,
}: UseDashboardTasksWorkspaceOptions): UseDashboardTasksWorkspaceResult {
  const todos = useTasksStore((state) => state.todos);
  const status = useTasksStore((state) => state.status);
  const [hasLoadError, setHasLoadError] = useState(initialLoadError);

  useEffect(() => {
    initializeTasksStore(initialTodos);
  }, [initialTodos]);

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

  return {
    todos,
    hasLoadError,
  };
}
