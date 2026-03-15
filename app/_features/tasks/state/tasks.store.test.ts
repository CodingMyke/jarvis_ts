// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "@/app/_features/tasks/types";
import { useTasksStore } from "./tasks.store";

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

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

describe("tasks store", () => {
  beforeEach(() => {
    useTasksStore.setState({
      todos: [],
      status: "idle",
      error: null,
      initialized: false,
    });
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

  it("refreshes todos from the API", async () => {
    const todos = [createTodo(), createTodo({ id: "todo-2", completed: true })];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ success: true, todos })),
    );

    const result = await useTasksStore.getState().refresh();

    expect(result).toEqual(todos);
    expect(useTasksStore.getState()).toMatchObject({
      todos,
      status: "ready",
      error: null,
      initialized: true,
    });
  });

  it("creates, updates and removes todos through refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(createJsonResponse({ success: true }))
        .mockResolvedValueOnce(
          createJsonResponse({
            success: true,
            todos: [createTodo({ id: "todo-created", text: "Nuovo task" })],
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ success: true }))
        .mockResolvedValueOnce(
          createJsonResponse({
            success: true,
            todos: [createTodo({ id: "todo-created", text: "Task aggiornato", completed: true })],
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ success: true }))
        .mockResolvedValueOnce(createJsonResponse({ success: true, todos: [] })),
    );

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
  });

  it("stores the API error on failed refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse(
          { success: false, message: "Boom tasks" },
          { status: 500 },
        ),
      ),
    );

    const result = await useTasksStore.getState().refresh();

    expect(result).toEqual([]);
    expect(useTasksStore.getState()).toMatchObject({
      status: "error",
      error: "Boom tasks",
      initialized: true,
    });
  });
});
