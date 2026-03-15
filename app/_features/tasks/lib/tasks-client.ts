import type { Todo } from "@/app/_features/tasks/types";

interface TasksApiResponse {
  success?: boolean;
  todos?: Todo[];
  message?: string;
  error?: string;
}

function getErrorMessage(response: TasksApiResponse | null, fallback: string): string {
  return response?.message ?? response?.error ?? fallback;
}

function normalizeTodo(todo: Todo): Todo {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.createdAt ?? 0,
    updatedAt: todo.updatedAt ?? 0,
  };
}

async function parseTasksResponse(response: Response): Promise<TasksApiResponse | null> {
  return (await response.json().catch(() => null)) as TasksApiResponse | null;
}

export async function fetchTasksFromApi(): Promise<Todo[]> {
  const response = await fetch("/api/tasks");
  const data = await parseTasksResponse(response);

  if (!response.ok || !data?.success || !Array.isArray(data.todos)) {
    throw new Error(getErrorMessage(data, `Errore HTTP ${response.status}`));
  }

  return data.todos.map(normalizeTodo);
}

export async function createTaskFromApi(text: string): Promise<void> {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    throw new Error("Testo todo non valido.");
  }

  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: trimmedText }),
  });
  const data = await parseTasksResponse(response);

  if (!response.ok || !data?.success) {
    throw new Error(getErrorMessage(data, `Errore HTTP ${response.status}`));
  }
}

export async function updateTaskFromApi(
  id: string,
  updates: Partial<Pick<Todo, "text" | "completed">>,
): Promise<void> {
  const response = await fetch("/api/tasks", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      ...updates,
    }),
  });
  const data = await parseTasksResponse(response);

  if (!response.ok || !data?.success) {
    throw new Error(getErrorMessage(data, `Errore HTTP ${response.status}`));
  }
}

export async function deleteTaskFromApi(id: string): Promise<void> {
  const response = await fetch("/api/tasks", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  const data = await parseTasksResponse(response);

  if (!response.ok || !data?.success) {
    throw new Error(getErrorMessage(data, `Errore HTTP ${response.status}`));
  }
}

export async function clearCompletedTasksFromApi(): Promise<void> {
  const response = await fetch("/api/tasks", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deleteCompleted: true }),
  });
  const data = await parseTasksResponse(response);

  if (!response.ok || !data?.success) {
    throw new Error(getErrorMessage(data, `Errore HTTP ${response.status}`));
  }
}
