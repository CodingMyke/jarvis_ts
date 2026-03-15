// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "@/app/_features/tasks/types";
import {
  createTodos,
  deleteTodos,
  getTodos,
  updateTodos,
} from "./tasks-client";

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

function stubFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("tasks client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns normalized todos on getTodos success", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        todos: [
          { id: "todo-1", text: "Comprare il latte", completed: false, createdAt: 1 },
          { id: "todo-2", text: "Chiamare Luca", completed: true },
        ],
        count: 2,
        completedCount: 1,
        pendingCount: 1,
      }),
    );

    const result = await getTodos();

    expect(result).toEqual({
      success: true,
      todos: [
        createTodo({ updatedAt: 0 }),
        createTodo({
          id: "todo-2",
          text: "Chiamare Luca",
          completed: true,
          createdAt: 0,
          updatedAt: 0,
        }),
      ],
      count: 2,
      completedCount: 1,
      pendingCount: 1,
    });
  });

  it("returns a normalized error on getTodos HTTP failures", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          success: false,
          error: "TASKS_NOT_CONFIGURED",
          errorMessage: "Google Tasks non è configurato.",
        },
        { status: 503 },
      ),
    );

    const result = await getTodos();

    expect(result).toEqual({
      success: false,
      error: "TASKS_NOT_CONFIGURED",
      errorMessage: "Google Tasks non è configurato.",
      status: 503,
    });
  });

  it("creates a single todo", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        todo: { id: "todo-created", text: "Nuovo task", completed: false },
      }),
    );

    const result = await createTodos({ text: " Nuovo task " });

    expect(fetchMock).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({ method: "POST" }));
    expect(result).toEqual({
      success: true,
      todo: createTodo({
        id: "todo-created",
        text: "Nuovo task",
        completed: false,
        createdAt: 0,
        updatedAt: 0,
      }),
    });
  });

  it("creates todos in batch", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        todos: [
          { id: "todo-1", text: "Latte", completed: false },
          { id: "todo-2", text: "Pane", completed: false },
        ],
        count: 2,
      }),
    );

    const result = await createTodos({ texts: ["Latte", "Pane"] });

    expect(result).toEqual({
      success: true,
      todos: [
        createTodo({ text: "Latte", createdAt: 0, updatedAt: 0 }),
        createTodo({ id: "todo-2", text: "Pane", createdAt: 0, updatedAt: 0 }),
      ],
      count: 2,
      requestedCount: 2,
    });
  });

  it("short-circuits invalid create payloads without fetch", async () => {
    const fetchMock = stubFetch();

    const result = await createTodos({ text: "   " });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: "text: Il testo non può essere vuoto",
      status: 400,
    });
  });

  it("updates a single todo", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        todo: { id: "todo-1", text: "Task aggiornato", completed: true },
      }),
    );

    const result = await updateTodos({
      id: "todo-1",
      text: "Task aggiornato",
      completed: true,
    });

    expect(result).toEqual({
      success: true,
      todo: createTodo({
        text: "Task aggiornato",
        completed: true,
        createdAt: 0,
        updatedAt: 0,
      }),
    });
  });

  it("returns failedIds on batch updates", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        todos: [{ id: "todo-1", text: "Latte", completed: true }],
        count: 1,
        requestedCount: 2,
        failedIds: ["todo-2"],
      }),
    );

    const result = await updateTodos({
      updates: [
        { id: "todo-1", completed: true },
        { id: "todo-2", completed: true },
      ],
    });

    expect(result).toEqual({
      success: true,
      todos: [createTodo({ text: "Latte", completed: true, createdAt: 0, updatedAt: 0 })],
      count: 1,
      requestedCount: 2,
      failedIds: ["todo-2"],
    });
  });

  it("deletes a single todo by id", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        deletedTodo: { id: "todo-1" },
      }),
    );

    const result = await deleteTodos({ id: "todo-1" });

    expect(result).toEqual({
      success: true,
      deletedTodo: { id: "todo-1", text: undefined },
    });
  });

  it("deletes multiple todos by ids", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        deletedTodos: [
          { id: "todo-1", text: "Latte" },
          { id: "todo-2", text: "Pane" },
        ],
        count: 2,
        requestedCount: 2,
      }),
    );

    const result = await deleteTodos({ ids: ["todo-1", "todo-2"] });

    expect(result).toEqual({
      success: true,
      deletedTodos: [
        { id: "todo-1", text: "Latte" },
        { id: "todo-2", text: "Pane" },
      ],
      count: 2,
      requestedCount: 2,
    });
  });

  it("supports deleteAll and deleteCompleted", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          deletedAll: true,
          count: 4,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          deletedCompleted: true,
        }),
      );

    await expect(deleteTodos({ deleteAll: true })).resolves.toEqual({
      success: true,
      deletedAll: true,
      count: 4,
    });
    await expect(deleteTodos({ deleteCompleted: true })).resolves.toEqual({
      success: true,
      deletedCompleted: true,
    });
  });

  it("short-circuits invalid delete payloads without fetch", async () => {
    const fetchMock = stubFetch();

    const result = await deleteTodos({ ids: [] });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "INVALID_PAYLOAD",
      errorMessage: "ids: Too small: expected array to have >=1 items",
      status: 400,
    });
  });
});
