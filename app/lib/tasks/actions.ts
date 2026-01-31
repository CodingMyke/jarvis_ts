"use server";

import { getTasks, isTasksConfigured } from "./tasks.service";
import type { TodoFromTask } from "./types";

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
