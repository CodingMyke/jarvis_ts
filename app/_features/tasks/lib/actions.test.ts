// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("tasks server actions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns SSR tasks only when Google Tasks is configured", async () => {
    const getTasks = vi
      .fn()
      .mockResolvedValueOnce({
        tasks: [{ id: "task-1", text: "Comprare latte", completed: false }],
      })
      .mockRejectedValueOnce(new Error("provider down"));
    const isTasksConfigured = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(true);

    vi.doMock("../server/tasks.service", () => ({
      getTasks,
      isTasksConfigured,
    }));

    const { fetchTasks } = await import("./actions");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(fetchTasks()).resolves.toEqual([]);
    await expect(fetchTasks()).resolves.toEqual([
      { id: "task-1", text: "Comprare latte", completed: false },
    ]);
    await expect(fetchTasks()).resolves.toEqual([]);

    expect(getTasks).toHaveBeenCalledWith({ showCompleted: true });
    expect(errorSpy).toHaveBeenCalled();
  });
});
