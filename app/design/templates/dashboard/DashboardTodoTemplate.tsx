"use client";

import type { Todo } from "@/app/_features/tasks";
import { DashboardTodoPanel } from "@/app/design/organisms/tasks/DashboardTodoPanel";
import { useDashboardTasksWorkspace } from "./useDashboardTasksWorkspace";

interface DashboardTodoTemplateProps {
  initialTodos: Todo[];
  initialLoadError: boolean;
}

export function DashboardTodoTemplate({
  initialTodos,
  initialLoadError,
}: DashboardTodoTemplateProps) {
  const {
    todos,
    hasLoadError,
  } = useDashboardTasksWorkspace({
    initialTodos,
    initialLoadError,
  });

  const hasTodos = todos.length > 0;

  return (
    <section className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">ToDo</h2>
      {hasTodos ? (
        <DashboardTodoPanel />
      ) : (
        <p className="text-sm text-muted">
          {hasLoadError ? "Si è verificato un errore" : "Non ci sono elementi"}
        </p>
      )}
    </section>
  );
}
