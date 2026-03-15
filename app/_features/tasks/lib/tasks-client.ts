import type { Todo } from "@/app/_features/tasks/types";
import {
  getTaskSchemaErrorMessage,
  taskCreateBodySchema,
  taskDeleteBodySchema,
  taskUpdateBodySchema,
} from "./task-operation.schemas";

export interface OperationError {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
}

export type GetTodosOperationResult =
  | {
      success: true;
      todos: Todo[];
      count: number;
      completedCount: number;
      pendingCount: number;
    }
  | OperationError;

export type CreateTodosOperationResult =
  | {
      success: true;
      todo: Todo;
    }
  | {
      success: true;
      todos: Todo[];
      count: number;
      requestedCount: number;
    }
  | OperationError;

export type UpdateTodosOperationResult =
  | {
      success: true;
      todo: Todo;
    }
  | {
      success: true;
      todos: Todo[];
      count: number;
      requestedCount: number;
      failedIds?: string[];
    }
  | OperationError;

export type DeleteTodosOperationResult =
  | {
      success: true;
      deletedTodo: {
        id: string;
        text?: string;
      };
    }
  | {
      success: true;
      deletedTodos: Array<{
        id: string;
        text?: string;
      }>;
      count: number;
      requestedCount: number;
    }
  | {
      success: true;
      deletedAll: true;
      count: number;
    }
  | {
      success: true;
      deletedCompleted: true;
    }
  | OperationError;

interface TasksApiResponse {
  success?: boolean;
  todos?: Todo[];
  todo?: Todo;
  count?: number;
  completedCount?: number;
  pendingCount?: number;
  requestedCount?: number;
  failedIds?: string[];
  deletedTodo?: {
    id?: string;
    text?: string;
  };
  deletedTodos?: Array<{
    id?: string;
    text?: string;
  }>;
  deletedAll?: boolean;
  deletedCompleted?: boolean;
  message?: string;
  error?: string;
  errorMessage?: string;
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

function getOperationErrorMessage(response: TasksApiResponse | null, fallback: string): string {
  return response?.errorMessage ?? response?.message ?? response?.error ?? fallback;
}

function toOperationError(
  response: TasksApiResponse | null,
  fallbackError: string,
  fallbackMessage: string,
  status?: number,
): OperationError {
  return {
    success: false,
    error: response?.error ?? fallbackError,
    errorMessage: getOperationErrorMessage(response, fallbackMessage),
    status,
  };
}

function toUnexpectedOperationError(error: unknown, fallbackMessage: string): OperationError {
  return {
    success: false,
    error: "EXECUTION_ERROR",
    errorMessage: error instanceof Error ? error.message : fallbackMessage,
  };
}

async function parseTasksResponse(response: Response): Promise<TasksApiResponse | null> {
  return (await response.json().catch(() => null)) as TasksApiResponse | null;
}

export async function getTodos(): Promise<GetTodosOperationResult> {
  try {
    const response = await fetch("/api/tasks");
    const data = await parseTasksResponse(response);

    if (!response.ok || !data?.success || !Array.isArray(data.todos)) {
      return toOperationError(
        data,
        "GET_TODOS_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    const todos = data.todos.map(normalizeTodo);
    const completedCount =
      typeof data.completedCount === "number"
        ? data.completedCount
        : todos.filter((todo) => todo.completed).length;

    return {
      success: true,
      todos,
      count: typeof data.count === "number" ? data.count : todos.length,
      completedCount,
      pendingCount:
        typeof data.pendingCount === "number" ? data.pendingCount : todos.length - completedCount,
    };
  } catch (error) {
    return toUnexpectedOperationError(
      error,
      "Errore sconosciuto durante il caricamento dei task.",
    );
  }
}

export async function createTodos(
  input: { text: string } | { texts: string[] },
): Promise<CreateTodosOperationResult> {
  const parsed = taskCreateBodySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getTaskSchemaErrorMessage(parsed.error, "Payload non valido"),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseTasksResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(
        data,
        "CREATION_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    if ("text" in parsed.data) {
      if (!data.todo) {
        return toOperationError(
          data,
          "CREATION_FAILED",
          "La risposta non contiene il task creato.",
          response.status,
        );
      }

      return {
        success: true,
        todo: normalizeTodo(data.todo),
      };
    }

    const todos = Array.isArray(data.todos) ? data.todos.map(normalizeTodo) : [];

    return {
      success: true,
      todos,
      count: typeof data.count === "number" ? data.count : todos.length,
      requestedCount: parsed.data.texts.length,
    };
  } catch (error) {
    return toUnexpectedOperationError(error, "Errore sconosciuto durante la creazione del task.");
  }
}

export async function updateTodos(
  input:
    | { id: string; text?: string; completed?: boolean }
    | { updates: Array<{ id: string; text?: string; completed?: boolean }> },
): Promise<UpdateTodosOperationResult> {
  const parsed = taskUpdateBodySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getTaskSchemaErrorMessage(parsed.error, "Payload non valido"),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseTasksResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(
        data,
        "UPDATE_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    if ("id" in parsed.data) {
      if (!data.todo) {
        return toOperationError(
          data,
          "UPDATE_FAILED",
          "La risposta non contiene il task aggiornato.",
          response.status,
        );
      }

      return {
        success: true,
        todo: normalizeTodo(data.todo),
      };
    }

    const todos = Array.isArray(data.todos) ? data.todos.map(normalizeTodo) : [];

    return {
      success: true,
      todos,
      count: typeof data.count === "number" ? data.count : todos.length,
      requestedCount:
        typeof data.requestedCount === "number"
          ? data.requestedCount
          : parsed.data.updates.length,
      ...(Array.isArray(data.failedIds) && data.failedIds.length > 0
        ? { failedIds: data.failedIds }
        : {}),
    };
  } catch (error) {
    return toUnexpectedOperationError(
      error,
      "Errore sconosciuto durante l'aggiornamento del task.",
    );
  }
}

export async function deleteTodos(
  input:
    | { id: string }
    | { ids: string[] }
    | { deleteAll: true }
    | { deleteCompleted: true },
): Promise<DeleteTodosOperationResult> {
  const parsed = taskDeleteBodySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: getTaskSchemaErrorMessage(parsed.error, "Payload non valido"),
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/tasks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });
    const data = await parseTasksResponse(response);

    if (!response.ok || !data?.success) {
      return toOperationError(
        data,
        "DELETE_FAILED",
        `Errore HTTP ${response.status}`,
        response.status,
      );
    }

    if (parsed.data.deleteCompleted) {
      return {
        success: true,
        deletedCompleted: true,
      };
    }

    if (parsed.data.deleteAll) {
      return {
        success: true,
        deletedAll: true,
        count: typeof data?.count === "number" ? data.count : 0,
      };
    }

    if (parsed.data.id) {
      return {
        success: true,
        deletedTodo: {
          id: data?.deletedTodo?.id ?? parsed.data.id,
          text: data?.deletedTodo?.text,
        },
      };
    }

    return {
      success: true,
      deletedTodos: Array.isArray(data?.deletedTodos)
        ? data.deletedTodos
            .filter((todo): todo is { id: string; text?: string } => typeof todo.id === "string")
            .map((todo) => ({
              id: todo.id,
              text: todo.text,
            }))
        : [],
      count: typeof data?.count === "number" ? data.count : 0,
      requestedCount:
        typeof data?.requestedCount === "number"
          ? data.requestedCount
          : Array.isArray(parsed.data.ids)
            ? parsed.data.ids.length
            : 0,
    };
  } catch (error) {
    return toUnexpectedOperationError(
      error,
      "Errore sconosciuto durante l'eliminazione del task.",
    );
  }
}
