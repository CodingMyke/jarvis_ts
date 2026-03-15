// used the fkg testing skill zioo
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTodos,
  deleteTodos,
  getTodos,
  updateTodos,
} from "@/app/_features/tasks/lib/tasks-client";
import { createTodoTool } from "./create-todo.tool";
import { deleteTodoTool } from "./delete-todo.tool";
import { getTodosTool } from "./get-todos.tool";
import { updateTodoTool } from "./update-todo.tool";

vi.mock("@/app/_features/tasks/lib/tasks-client", () => ({
  createTodos: vi.fn(),
  deleteTodos: vi.fn(),
  getTodos: vi.fn(),
  updateTodos: vi.fn(),
}));

describe("task tools", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps getTodos using the shared operation layer", async () => {
    vi.mocked(getTodos).mockResolvedValue({
      success: true,
      todos: [{ id: "todo-1", text: "Latte", completed: false, createdAt: 0, updatedAt: 0 }],
      count: 1,
      completedCount: 0,
      pendingCount: 1,
    });

    const result = await getTodosTool.execute({}, {} as never);

    expect(getTodos).toHaveBeenCalledOnce();
    expect(result).toEqual({
      result: {
        success: true,
        todos: [{ id: "todo-1", text: "Latte", completed: false, createdAt: 0, updatedAt: 0 }],
        count: 1,
        completedCount: 0,
        pendingCount: 1,
      },
    });
  });

  it("maps createTodo using the shared operation layer", async () => {
    vi.mocked(createTodos).mockResolvedValue({
      success: true,
      todo: { id: "todo-1", text: "Latte", completed: false, createdAt: 0, updatedAt: 0 },
    });

    const result = await createTodoTool.execute({ text: "Latte" }, {} as never);

    expect(createTodos).toHaveBeenCalledWith({ text: "Latte" });
    expect(result.result).toEqual({
      success: true,
      todo: { id: "todo-1", text: "Latte", completed: false, createdAt: 0, updatedAt: 0 },
    });
  });

  it("maps updateTodo using the shared operation layer", async () => {
    vi.mocked(updateTodos).mockResolvedValue({
      success: true,
      todos: [{ id: "todo-1", text: "Latte", completed: true, createdAt: 0, updatedAt: 0 }],
      count: 1,
      requestedCount: 1,
    });

    const result = await updateTodoTool.execute(
      { updates: [{ id: "todo-1", completed: true }] },
      {} as never,
    );

    expect(updateTodos).toHaveBeenCalledWith({
      updates: [{ id: "todo-1", completed: true }],
    });
    expect(result.result).toEqual({
      success: true,
      todos: [{ id: "todo-1", text: "Latte", completed: true, createdAt: 0, updatedAt: 0 }],
      count: 1,
      requestedCount: 1,
    });
  });

  it("maps deleteTodo using the shared operation layer", async () => {
    vi.mocked(deleteTodos).mockResolvedValue({
      success: true,
      deletedAll: true,
      count: 3,
    });

    const result = await deleteTodoTool.execute({ deleteAll: true }, {} as never);

    expect(deleteTodos).toHaveBeenCalledWith({ deleteAll: true });
    expect(result.result).toEqual({
      success: true,
      deletedAll: true,
      count: 3,
    });
  });
});
