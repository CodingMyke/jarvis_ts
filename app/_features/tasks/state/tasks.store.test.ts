// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTodos,
  deleteTodos,
  getTodos,
  updateTodos,
} from "@/app/_features/tasks/lib/tasks-client";
import type { Todo } from "@/app/_features/tasks/types";
import { initializeTasksStore, useTasksStore } from "./tasks.store";

vi.mock("@/app/_features/tasks/lib/tasks-client", () => ({
  createTodos: vi.fn(),
  deleteTodos: vi.fn(),
  getTodos: vi.fn(),
  updateTodos: vi.fn(),
}));

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "todo-1",
    text: "Comprare il latte",
    completed: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("tasks store", () => {
  beforeEach(() => {
    useTasksStore.setState({
      todos: [],
      status: "idle",
      error: null,
      initialized: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bootstraps SSR todos", () => {
    const todos = [createTodo()];

    useTasksStore.getState().initialize(todos);

    expect(useTasksStore.getState()).toMatchObject({
      todos,
      status: "ready",
      error: null,
      initialized: true,
    });
  });

  it("refreshes todos from the shared operation layer", async () => {
    const todos = [createTodo(), createTodo({ id: "todo-2", completed: true })];
    vi.mocked(getTodos).mockResolvedValue({
      success: true,
      todos,
      count: todos.length,
      completedCount: 1,
      pendingCount: 1,
    });

    const result = await useTasksStore.getState().refresh();

    expect(getTodos).toHaveBeenCalledOnce();
    expect(result).toEqual(todos);
    expect(useTasksStore.getState()).toMatchObject({
      todos,
      status: "ready",
      error: null,
      initialized: true,
    });
  });

  it("creates, updates, removes and clears completed todos through refresh", async () => {
    vi.mocked(createTodos).mockResolvedValue({
      success: true,
      todo: createTodo({ id: "todo-created", text: "Nuovo task" }),
    });
    vi.mocked(updateTodos).mockResolvedValue({
      success: true,
      todo: createTodo({ id: "todo-created", text: "Task aggiornato", completed: true }),
    });
    vi.mocked(deleteTodos)
      .mockResolvedValueOnce({
        success: true,
        deletedTodo: { id: "todo-created" },
      })
      .mockResolvedValueOnce({
        success: true,
        deletedCompleted: true,
      });
    vi.mocked(getTodos)
      .mockResolvedValueOnce({
        success: true,
        todos: [createTodo({ id: "todo-created", text: "Nuovo task" })],
        count: 1,
        completedCount: 0,
        pendingCount: 1,
      })
      .mockResolvedValueOnce({
        success: true,
        todos: [createTodo({ id: "todo-created", text: "Task aggiornato", completed: true })],
        count: 1,
        completedCount: 1,
        pendingCount: 0,
      })
      .mockResolvedValueOnce({
        success: true,
        todos: [],
        count: 0,
        completedCount: 0,
        pendingCount: 0,
      })
      .mockResolvedValueOnce({
        success: true,
        todos: [],
        count: 0,
        completedCount: 0,
        pendingCount: 0,
      });

    await expect(useTasksStore.getState().create("Nuovo task")).resolves.toBe(true);
    expect(useTasksStore.getState().todos[0]?.text).toBe("Nuovo task");

    await expect(
      useTasksStore.getState().update("todo-created", {
        text: "Task aggiornato",
        completed: true,
      }),
    ).resolves.toBe(true);
    expect(useTasksStore.getState().todos[0]).toMatchObject({
      text: "Task aggiornato",
      completed: true,
    });

    await expect(useTasksStore.getState().remove("todo-created")).resolves.toBe(true);
    expect(useTasksStore.getState().todos).toEqual([]);

    await expect(useTasksStore.getState().clearCompleted()).resolves.toBe(true);
    expect(useTasksStore.getState().todos).toEqual([]);
  });

  it("stores the operation error on failed refresh", async () => {
    vi.mocked(getTodos).mockResolvedValue({
      success: false,
      error: "GET_TODOS_FAILED",
      errorMessage: "Boom tasks",
      status: 500,
    });

    const result = await useTasksStore.getState().refresh();

    expect(result).toEqual([]);
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Boom tasks",
      initialized: true,
    });
  });

  it("stores mutation errors without refreshing", async () => {
    vi.mocked(createTodos).mockResolvedValue({
      success: false,
      error: "CREATION_FAILED",
      errorMessage: "Creazione fallita",
      status: 500,
    });

    await expect(useTasksStore.getState().create("Nuovo task")).resolves.toBe(false);

    expect(getTodos).not.toHaveBeenCalled();
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Creazione fallita",
    });
  });

  it("stores update, delete and clear-completed errors without refreshing", async () => {
    vi.mocked(updateTodos).mockResolvedValue({
      success: false,
      error: "UPDATE_FAILED",
      errorMessage: "Aggiornamento fallito",
      status: 500,
    });
    vi.mocked(deleteTodos)
      .mockResolvedValueOnce({
        success: false,
        error: "DELETE_FAILED",
        errorMessage: "Eliminazione fallita",
        status: 500,
      })
      .mockResolvedValueOnce({
        success: false,
        error: "CLEAR_FAILED",
        errorMessage: "Pulizia fallita",
        status: 500,
      });

    await expect(
      useTasksStore.getState().update("todo-1", { completed: true }),
    ).resolves.toBe(false);
    expect(getTodos).not.toHaveBeenCalled();
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Aggiornamento fallito",
    });

    await expect(useTasksStore.getState().remove("todo-1")).resolves.toBe(false);
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Eliminazione fallita",
    });

    await expect(useTasksStore.getState().clearCompleted()).resolves.toBe(false);
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Pulizia fallita",
    });
  });

  it("exposes a helper to initialize the store outside React", () => {
    initializeTasksStore([createTodo({ id: "todo-boot" })]);

    expect(useTasksStore.getState()).toMatchObject({
      todos: [expect.objectContaining({ id: "todo-boot" })],
      status: "ready",
      initialized: true,
    });
  });
});
