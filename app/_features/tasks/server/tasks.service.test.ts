// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

function createProviderMocks() {
  return {
    getTaskLists: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    clearCompletedTasks: vi.fn(),
    isConfigured: vi.fn(),
  };
}

describe("tasks.service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns empty results when no default task list is available", async () => {
    const provider = createProviderMocks();
    provider.getTaskLists.mockResolvedValue([]);
    provider.isConfigured.mockReturnValue(false);

    vi.doMock("./google-tasks.provider", () => ({
      GoogleTasksProvider: class MockGoogleTasksProvider {
        getTaskLists = provider.getTaskLists;
        getTasks = provider.getTasks;
        createTask = provider.createTask;
        updateTask = provider.updateTask;
        deleteTask = provider.deleteTask;
        clearCompletedTasks = provider.clearCompletedTasks;
        isConfigured = provider.isConfigured;
      },
    }));

    const service = await import("./tasks.service");

    await expect(service.getTasks()).resolves.toEqual({ tasks: [], taskListId: "" });
    await expect(service.createTask("Nuovo task")).resolves.toEqual({
      success: false,
      error: "Nessuna task list disponibile. Configura Google Tasks.",
    });
    await expect(service.updateTask("1", { completed: true })).resolves.toEqual({
      success: false,
      error: "Nessuna task list disponibile.",
    });
    await expect(service.deleteTask("1")).resolves.toEqual({
      success: false,
      error: "Nessuna task list disponibile.",
    });
    await expect(service.deleteCompletedTasks()).resolves.toEqual({
      success: false,
      error: "Nessuna task list disponibile.",
    });
    expect(service.isTasksConfigured()).toBe(false);
  });

  it("caches the default task list id and delegates provider calls", async () => {
    const provider = createProviderMocks();
    provider.getTaskLists.mockResolvedValue([{ id: "default-list" }]);
    provider.getTasks.mockResolvedValue({
      tasks: [{ id: "1", text: "Todo", completed: false }],
      taskListId: "default-list",
    });
    provider.createTask.mockResolvedValue({
      success: true,
      task: { id: "2", text: "Creato", completed: false },
    });
    provider.updateTask.mockResolvedValue({
      success: true,
      task: { id: "1", text: "Aggiornato", completed: true },
    });
    provider.deleteTask.mockResolvedValue({ success: true });
    provider.clearCompletedTasks.mockResolvedValue({ success: true });
    provider.isConfigured.mockReturnValue(true);

    vi.doMock("./google-tasks.provider", () => ({
      GoogleTasksProvider: class MockGoogleTasksProvider {
        getTaskLists = provider.getTaskLists;
        getTasks = provider.getTasks;
        createTask = provider.createTask;
        updateTask = provider.updateTask;
        deleteTask = provider.deleteTask;
        clearCompletedTasks = provider.clearCompletedTasks;
        isConfigured = provider.isConfigured;
      },
    }));

    const service = await import("./tasks.service");

    await expect(service.getTasks({ showCompleted: true })).resolves.toEqual({
      tasks: [{ id: "1", text: "Todo", completed: false }],
      taskListId: "default-list",
    });
    await expect(service.createTask("Creato", "nota")).resolves.toMatchObject({
      success: true,
      task: { id: "2" },
    });
    await expect(service.updateTask("1", { text: "Aggiornato", completed: true })).resolves
      .toMatchObject({
        success: true,
        task: { id: "1" },
      });
    await expect(service.deleteTask("1")).resolves.toEqual({ success: true });
    await expect(service.deleteCompletedTasks()).resolves.toEqual({ success: true });
    expect(service.isTasksConfigured()).toBe(true);

    expect(provider.getTaskLists).toHaveBeenCalledTimes(1);
    expect(provider.getTasks).toHaveBeenCalledWith({
      showCompleted: true,
      taskListId: "default-list",
    });
    expect(provider.createTask).toHaveBeenCalledWith({
      taskListId: "default-list",
      title: "Creato",
      notes: "nota",
    });
    expect(provider.updateTask).toHaveBeenCalledWith({
      taskListId: "default-list",
      taskId: "1",
      title: "Aggiornato",
      completed: true,
    });
    expect(provider.deleteTask).toHaveBeenCalledWith("default-list", "1");
    expect(provider.clearCompletedTasks).toHaveBeenCalledWith("default-list");
  });

  it("deletes all tasks one by one and counts only successful deletions", async () => {
    const provider = createProviderMocks();
    provider.getTaskLists.mockResolvedValue([{ id: "default-list" }]);
    provider.getTasks.mockResolvedValue({
      tasks: [
        { id: "1", text: "Uno", completed: false },
        { id: "2", text: "Due", completed: true },
      ],
      taskListId: "default-list",
    });
    provider.deleteTask
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "skip" });
    provider.isConfigured.mockReturnValue(true);

    vi.doMock("./google-tasks.provider", () => ({
      GoogleTasksProvider: class MockGoogleTasksProvider {
        getTaskLists = provider.getTaskLists;
        getTasks = provider.getTasks;
        createTask = provider.createTask;
        updateTask = provider.updateTask;
        deleteTask = provider.deleteTask;
        clearCompletedTasks = provider.clearCompletedTasks;
        isConfigured = provider.isConfigured;
      },
    }));

    const service = await import("./tasks.service");

    await expect(service.deleteAllTasks()).resolves.toEqual({
      success: true,
      deletedCount: 1,
    });
  });
});
