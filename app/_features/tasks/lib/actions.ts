"use server";

import { getTasks, isTasksConfigured } from "../server/tasks.service";
import type { TodoFromTask } from "../types/types";

export interface DashboardTasksResult {
  todos: TodoFromTask[];
  hasError: boolean;
}

/**
 * Server action per ottenere i task.
 * Chiamata in SSR per popolare la pagina iniziale (come fetchCalendarEvents per il calendario).
 */
export async function fetchTasks(): Promise<TodoFromTask[]> {
  try {
    if (!isTasksConfigured()) return [];
    const { tasks } = await getTasks({ showCompleted: true });
    return tasks;
  } catch (error) {
    console.error("[fetchTasks] Errore:", error);
    return [];
  }
}

/**
 * Server action for dashboard tasks with an explicit load-error flag.
 * This does not change the contract used by the assistant page.
 */
export async function fetchDashboardTasks(): Promise<DashboardTasksResult> {
  try {
    if (!isTasksConfigured()) {
      return {
        todos: [],
        hasError: false,
      };
    }

    const { tasks } = await getTasks({ showCompleted: true });
    return {
      todos: tasks,
      hasError: false,
    };
  } catch (error) {
    console.error("[fetchDashboardTasks] Errore:", error);
    return {
      todos: [],
      hasError: true,
    };
  }
}
