import {
  createTask,
  deleteAllTasks,
  deleteCompletedTasks,
  deleteTask,
  getTasks,
  isTasksConfigured,
  updateTask,
} from "./tasks.service";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import {
  taskCreateBodySchema,
  taskDeleteBodySchema,
  taskUpdateBodySchema,
} from "./tasks-route.schemas";

function getTasksConfigurationError() {
  return jsonError(503, {
    error: "TASKS_NOT_CONFIGURED",
    message: "Google Tasks non è configurato.",
    errorMessage: "Configura Google Tasks prima di usare questa route.",
    todos: [],
  });
}

export async function handleGetTasks() {
  if (!isTasksConfigured()) {
    return getTasksConfigurationError();
  }

  const { tasks } = await getTasks({ showCompleted: true });
  const completedCount = tasks.filter((task) => task.completed).length;

  return jsonOk({
    success: true,
    todos: tasks,
    count: tasks.length,
    completedCount,
    pendingCount: tasks.length - completedCount,
  });
}

export async function handleCreateTask(body: unknown) {
  if (!isTasksConfigured()) {
    return getTasksConfigurationError();
  }

  const parsed = taskCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  if ("text" in parsed.data && parsed.data.text !== undefined) {
    const result = await createTask(parsed.data.text);
    if (!result.success || !result.task) {
      return jsonError(500, {
        error: "CREATION_FAILED",
        errorMessage: result.error || "Errore durante la creazione",
      });
    }

    return jsonOk({
      success: true,
      todo: {
        id: result.task.id,
        text: result.task.text,
        completed: result.task.completed,
      },
    });
  }

  const todos: { id: string; text: string; completed: boolean }[] = [];
  for (const title of parsed.data.texts) {
    const result = await createTask(title);
    if (result.success && result.task) {
      todos.push({
        id: result.task.id,
        text: result.task.text,
        completed: result.task.completed,
      });
    }
  }

  return jsonOk({
    success: true,
    todos,
    count: todos.length,
  });
}

export async function handleUpdateTask(body: unknown) {
  if (!isTasksConfigured()) {
    return getTasksConfigurationError();
  }

  const parsed = taskUpdateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  if ("id" in parsed.data) {
    const result = await updateTask(parsed.data.id, {
      text: parsed.data.text,
      completed: parsed.data.completed,
    });

    if (!result.success || !result.task) {
      return jsonError(500, {
        error: "UPDATE_FAILED",
        errorMessage: result.error || "Errore durante l'aggiornamento",
      });
    }

    return jsonOk({
      success: true,
      todo: {
        id: result.task.id,
        text: result.task.text,
        completed: result.task.completed,
      },
    });
  }

  const todos: { id: string; text: string; completed: boolean }[] = [];
  const failedIds: string[] = [];

  for (const update of parsed.data.updates) {
    const result = await updateTask(update.id, {
      text: update.text,
      completed: update.completed,
    });

    if (result.success && result.task) {
      todos.push({
        id: result.task.id,
        text: result.task.text,
        completed: result.task.completed,
      });
      continue;
    }

    failedIds.push(update.id);
  }

  return jsonOk({
    success: true,
    todos,
    count: todos.length,
    requestedCount: parsed.data.updates.length,
    ...(failedIds.length > 0 ? { failedIds } : {}),
  });
}

export async function handleDeleteTask(body: unknown, searchParams: URLSearchParams) {
  if (!isTasksConfigured()) {
    return getTasksConfigurationError();
  }

  const rawBody = typeof body === "object" && body !== null ? body : {};
  const parsed = taskDeleteBodySchema.safeParse({
    ...rawBody,
    id: (
      typeof rawBody === "object"
      && rawBody !== null
      && "id" in rawBody
      && typeof rawBody.id === "string"
    ) ? rawBody.id : (searchParams.get("id") ?? undefined),
  });

  if (!parsed.success) {
    return jsonError(400, {
      error: "INVALID_PAYLOAD",
      errorMessage: getZodErrorMessage(parsed.error),
    });
  }

  if (parsed.data.deleteCompleted) {
    const result = await deleteCompletedTasks();
    if (!result.success) {
      return jsonError(500, {
        error: "DELETE_FAILED",
        errorMessage: result.error,
      });
    }

    return jsonOk({
      success: true,
      deletedCompleted: true,
    });
  }

  if (parsed.data.deleteAll) {
    const result = await deleteAllTasks();
    if (!result.success) {
      return jsonError(500, {
        error: "DELETE_FAILED",
        errorMessage: result.error,
      });
    }

    return jsonOk({
      success: true,
      deletedAll: true,
      count: result.deletedCount,
    });
  }

  if (parsed.data.id) {
    const result = await deleteTask(parsed.data.id);
    if (!result.success) {
      return jsonError(500, {
        error: "DELETE_FAILED",
        errorMessage: result.error,
      });
    }

    return jsonOk({
      success: true,
      deletedTodo: { id: parsed.data.id },
    });
  }

  const deletedTodos: { id: string; text: string }[] = [];
  const { tasks } = await getTasks({ showCompleted: true });
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  let count = 0;

  for (const taskId of parsed.data.ids ?? []) {
    const result = await deleteTask(taskId);
    if (!result.success) {
      continue;
    }

    count += 1;
    const task = tasksById.get(taskId);
    if (task) {
      deletedTodos.push({ id: task.id, text: task.text });
    }
  }

  return jsonOk({
    success: true,
    deletedTodos,
    count,
    requestedCount: parsed.data.ids?.length ?? 0,
  });
}
