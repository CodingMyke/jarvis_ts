// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  createTask: vi.fn(),
  deleteAllTasks: vi.fn(),
  deleteCompletedTasks: vi.fn(),
  deleteTask: vi.fn(),
  getTasks: vi.fn(),
  isTasksConfigured: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("./tasks.service", () => serviceMocks);

import {
  handleCreateTask,
  handleDeleteTask,
  handleGetTasks,
  handleUpdateTask,
} from "./tasks-route.handlers";

describe("tasks route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.isTasksConfigured.mockReturnValue(true);
  });

  it("returns a 503 response when Google Tasks is not configured", async () => {
    serviceMocks.isTasksConfigured.mockReturnValue(false);

    const response = await handleGetTasks();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "TASKS_NOT_CONFIGURED",
      todos: [],
    });
  });

  it("returns todos and counts for GET", async () => {
    serviceMocks.getTasks.mockResolvedValue({
      tasks: [
        { id: "1", text: "Uno", completed: false },
        { id: "2", text: "Due", completed: true },
      ],
    });

    const response = await handleGetTasks();

    expect(serviceMocks.getTasks).toHaveBeenCalledWith({ showCompleted: true });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      count: 2,
      completedCount: 1,
      pendingCount: 1,
    });
  });

  it("validates create payloads and handles single create failures", async () => {
    const invalidResponse = await handleCreateTask({});

    serviceMocks.createTask.mockResolvedValueOnce({
      success: false,
      error: "boom",
    });
    const failureResponse = await handleCreateTask({ text: "Scrivi test" });

    expect(invalidResponse.status).toBe(400);
    expect(failureResponse.status).toBe(500);
    await expect(failureResponse.json()).resolves.toMatchObject({
      error: "CREATION_FAILED",
      errorMessage: "boom",
    });
  });

  it("creates single and batch todos", async () => {
    serviceMocks.createTask
      .mockResolvedValueOnce({
        success: true,
        task: { id: "1", text: "Singolo", completed: false },
      })
      .mockResolvedValueOnce({
        success: true,
        task: { id: "2", text: "Batch 1", completed: false },
      })
      .mockResolvedValueOnce({
        success: false,
        error: "skip",
      });

    const singleResponse = await handleCreateTask({ text: "Singolo" });
    const batchResponse = await handleCreateTask({ texts: ["Batch 1", "Batch 2"] });

    await expect(singleResponse.json()).resolves.toMatchObject({
      success: true,
      todo: { id: "1", text: "Singolo", completed: false },
    });
    await expect(batchResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
      todos: [{ id: "2", text: "Batch 1", completed: false }],
    });
  });

  it("validates, updates and reports batch failures", async () => {
    const invalidResponse = await handleUpdateTask({ id: "1" });

    serviceMocks.updateTask
      .mockResolvedValueOnce({
        success: true,
        task: { id: "1", text: "Aggiornato", completed: true },
      })
      .mockResolvedValueOnce({
        success: false,
        error: "boom",
      })
      .mockResolvedValueOnce({
        success: true,
        task: { id: "3", text: "Tre", completed: false },
      });

    const singleResponse = await handleUpdateTask({
      id: "1",
      completed: true,
    });
    const batchResponse = await handleUpdateTask({
      updates: [
        { id: "2", text: "Due" },
        { id: "3", completed: false },
      ],
    });

    expect(invalidResponse.status).toBe(400);
    await expect(singleResponse.json()).resolves.toMatchObject({
      success: true,
      todo: { id: "1", text: "Aggiornato", completed: true },
    });
    await expect(batchResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
      requestedCount: 2,
      failedIds: ["2"],
    });
  });

  it("deletes completed tasks, all tasks, a single task and multiple tasks", async () => {
    serviceMocks.deleteCompletedTasks.mockResolvedValue({ success: true });
    serviceMocks.deleteAllTasks.mockResolvedValue({ success: true, deletedCount: 4 });
    serviceMocks.deleteTask
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "skip" });
    serviceMocks.getTasks.mockResolvedValue({
      tasks: [
        { id: "a", text: "Alpha", completed: false },
        { id: "b", text: "Beta", completed: true },
      ],
    });

    const deleteCompletedResponse = await handleDeleteTask(
      { deleteCompleted: true },
      new URLSearchParams(),
    );
    const deleteAllResponse = await handleDeleteTask({ deleteAll: true }, new URLSearchParams());
    const deleteSingleResponse = await handleDeleteTask({}, new URLSearchParams("id=a"));
    const deleteManyResponse = await handleDeleteTask(
      { ids: ["a", "b"] },
      new URLSearchParams(),
    );

    await expect(deleteCompletedResponse.json()).resolves.toMatchObject({
      success: true,
      deletedCompleted: true,
    });
    await expect(deleteAllResponse.json()).resolves.toMatchObject({
      success: true,
      deletedAll: true,
      count: 4,
    });
    await expect(deleteSingleResponse.json()).resolves.toMatchObject({
      success: true,
      deletedTodo: { id: "a" },
    });
    await expect(deleteManyResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
      requestedCount: 2,
      deletedTodos: [{ id: "a", text: "Alpha" }],
    });
  });

  it("returns validation and deletion errors", async () => {
    serviceMocks.deleteCompletedTasks.mockResolvedValueOnce({
      success: false,
      error: "delete completed failed",
    });
    serviceMocks.deleteAllTasks.mockResolvedValueOnce({
      success: false,
      error: "delete all failed",
    });
    serviceMocks.deleteTask.mockResolvedValueOnce({
      success: false,
      error: "delete one failed",
    });

    const invalidResponse = await handleDeleteTask({}, new URLSearchParams());
    const completedFailureResponse = await handleDeleteTask(
      { deleteCompleted: true },
      new URLSearchParams(),
    );
    const deleteAllFailureResponse = await handleDeleteTask(
      { deleteAll: true },
      new URLSearchParams(),
    );
    const deleteOneFailureResponse = await handleDeleteTask(
      { id: "a" },
      new URLSearchParams(),
    );

    expect(invalidResponse.status).toBe(400);
    expect(completedFailureResponse.status).toBe(500);
    expect(deleteAllFailureResponse.status).toBe(500);
    expect(deleteOneFailureResponse.status).toBe(500);
  });
});
