"use client";

import type { Todo } from "@/app/_features/tasks";
import { DashboardTodoPanel } from "@/app/design/organisms/tasks/DashboardTodoPanel";
import { AppPanel, EmptyState, SectionHeader } from "@/app/_shared/ui";
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
    <AppPanel as="section" className="w-full space-y-3 p-4">
      <SectionHeader title="ToDo" />
      {hasTodos ? (
        <DashboardTodoPanel />
      ) : (
        <EmptyState
          description={hasLoadError ? "Si è verificato un errore" : "Non ci sono elementi"}
          variant={hasLoadError ? "error" : "default"}
        />
      )}
    </AppPanel>
  );
}
