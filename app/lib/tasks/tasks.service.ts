import { GoogleTasksProvider } from "./google-tasks.provider";
import type {
  GetTasksOptions,
  GetTasksResult,
  CreateTaskOptions,
  CreateTaskResult,
  UpdateTaskOptions,
  UpdateTaskResult,
  DeleteTaskResult,
  TodoFromTask,
} from "./types";

const provider = new GoogleTasksProvider();

let cachedDefaultTaskListId: string | null = null;

async function getDefaultTaskListId(): Promise<string | null> {
  if (cachedDefaultTaskListId) return cachedDefaultTaskListId;
  const lists = await provider.getTaskLists();
  const first = lists[0];
  if (first) cachedDefaultTaskListId = first.id;
  return cachedDefaultTaskListId;
}

/**
 * Servizio per i task Google. Usa la prima task list disponibile come default.
 */
export async function getTasks(options: Omit<GetTasksOptions, "taskListId"> = {}): Promise<GetTasksResult> {
  const taskListId = await getDefaultTaskListId();
  if (!taskListId) return { tasks: [], taskListId: "" };
  return provider.getTasks({ ...options, taskListId });
}

export async function createTask(title: string, notes?: string): Promise<CreateTaskResult> {
  const taskListId = await getDefaultTaskListId();
  if (!taskListId) return { success: false, error: "Nessuna task list disponibile. Configura Google Tasks." };
  return provider.createTask({ taskListId, title, notes });
}

export async function updateTask(
  taskId: string,
  updates: { text?: string; completed?: boolean }
): Promise<UpdateTaskResult> {
  const taskListId = await getDefaultTaskListId();
  if (!taskListId) return { success: false, error: "Nessuna task list disponibile." };
  return provider.updateTask({
    taskListId,
    taskId,
    title: updates.text,
    completed: updates.completed,
  });
}

export async function deleteTask(taskId: string): Promise<DeleteTaskResult> {
  const taskListId = await getDefaultTaskListId();
  if (!taskListId) return { success: false, error: "Nessuna task list disponibile." };
  return provider.deleteTask(taskListId, taskId);
}

export async function deleteCompletedTasks(): Promise<DeleteTaskResult> {
  const taskListId = await getDefaultTaskListId();
  if (!taskListId) return { success: false, error: "Nessuna task list disponibile." };
  return provider.clearCompletedTasks(taskListId);
}

/**
 * Elimina tutti i task della lista (cancellando uno per uno; l'API non espone "delete all").
 */
export async function deleteAllTasks(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const { tasks, taskListId } = await getTasks({ showCompleted: true });
  if (!taskListId || tasks.length === 0) return { success: true, deletedCount: 0 };
  let deleted = 0;
  for (const t of tasks) {
    const r = await provider.deleteTask(taskListId, t.id);
    if (r.success) deleted++;
  }
  return { success: true, deletedCount: deleted };
}

export function isTasksConfigured(): boolean {
  return provider.isConfigured();
}

export type { TodoFromTask };
