// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GoogleTasksProvider", () => {
  type PrivateGoogleTasksProvider = {
    getValidAccessToken(forceRefresh?: boolean): Promise<string | null>;
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refreshes and caches access tokens, including invalid_grant failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { GoogleTasksProvider } = await import("./google-tasks.provider");
    const provider = new GoogleTasksProvider({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const privateProvider = provider as unknown as PrivateGoogleTasksProvider;

    await expect(privateProvider.getValidAccessToken()).resolves.toBe("token-1");
    await expect(privateProvider.getValidAccessToken()).resolves.toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(privateProvider.getValidAccessToken(true)).rejects.toThrow(
      "REFRESH_TOKEN_EXPIRED",
    );
  });

  it("maps Google task API responses and validation errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "list-1", title: "Inbox" }] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "task-1",
                title: "Comprare latte",
                status: "completed",
                updated: "2026-03-15T10:30:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "task-2",
            title: "Nuovo task",
            status: "needsAction",
            updated: "2026-03-15T11:00:00.000Z",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "task-1",
            title: "Aggiornato",
            status: "completed",
            updated: "2026-03-15T12:00:00.000Z",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("bad request", { status: 400 }))
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(new Response("delete failed", { status: 500 }))
      .mockResolvedValueOnce(new Response("clear failed", { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    const { GoogleTasksProvider } = await import("./google-tasks.provider");
    const provider = new GoogleTasksProvider({ accessToken: "access-token" });

    await expect(provider.getTaskLists()).resolves.toEqual([{ id: "list-1", title: "Inbox" }]);
    await expect(
      provider.getTasks({
        taskListId: "list-1",
        showCompleted: false,
        maxResults: 20,
      }),
    ).resolves.toEqual({
      tasks: [
        {
          id: "task-1",
          text: "Comprare latte",
          completed: true,
          createdAt: Date.parse("2026-03-15T10:30:00.000Z"),
          updatedAt: Date.parse("2026-03-15T10:30:00.000Z"),
        },
      ],
      taskListId: "list-1",
    });

    await expect(provider.createTask({ taskListId: "list-1", title: "  Nuovo task  " })).resolves
      .toEqual({
        success: true,
        task: {
          id: "task-2",
          text: "Nuovo task",
          completed: false,
          createdAt: Date.parse("2026-03-15T11:00:00.000Z"),
          updatedAt: Date.parse("2026-03-15T11:00:00.000Z"),
        },
      });
    await expect(
      provider.updateTask({
        taskListId: "list-1",
        taskId: "task-1",
        title: " Aggiornato ",
        completed: true,
      }),
    ).resolves.toEqual({
      success: true,
      task: {
        id: "task-1",
        text: "Aggiornato",
        completed: true,
        createdAt: Date.parse("2026-03-15T12:00:00.000Z"),
        updatedAt: Date.parse("2026-03-15T12:00:00.000Z"),
      },
    });
    await expect(provider.deleteTask("list-1", "task-1")).resolves.toEqual({ success: true });
    await expect(provider.clearCompletedTasks("list-1")).resolves.toEqual({ success: true });

    await expect(provider.createTask({ taskListId: "list-1", title: "   " })).resolves.toEqual({
      success: false,
      error: "Il titolo del task è obbligatorio",
    });
    await expect(provider.updateTask({ taskListId: "list-1", taskId: "task-1" })).resolves
      .toEqual({
        success: false,
        error: "Nessun campo da aggiornare",
      });
    await expect(provider.deleteTask("list-1", "task-1")).resolves.toEqual({
      success: false,
      error: "HTTP 400",
    });
    await expect(provider.clearCompletedTasks("list-1")).resolves.toEqual({
      success: false,
      error: "HTTP 500",
    });

    const taskListRequest = fetchMock.mock.calls[0]?.[0];
    const getTasksRequest = String(fetchMock.mock.calls[1]?.[0]);
    const createTaskRequest = fetchMock.mock.calls[2];
    expect(String(taskListRequest)).toContain("/users/@me/lists");
    expect(getTasksRequest).toContain("showCompleted=false");
    expect(getTasksRequest).toContain("maxResults=20");
    expect(createTaskRequest?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
  });

  it("retries the API request after a 401 using a refreshed token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-2", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "list-1", title: "Inbox" }] }), {
          status: 200,
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { GoogleTasksProvider } = await import("./google-tasks.provider");
    const provider = new GoogleTasksProvider({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    await expect(provider.getTaskLists()).resolves.toEqual([{ id: "list-1", title: "Inbox" }]);

    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token-1" },
    });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token-2" },
    });
  });

  it("returns empty or configuration errors when Google Tasks is unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GoogleTasksProvider } = await import("./google-tasks.provider");
    const provider = new GoogleTasksProvider();

    expect(provider.isConfigured()).toBe(false);
    await expect(provider.getTaskLists()).resolves.toEqual([]);
    await expect(provider.getTasks({ taskListId: "list-1" })).resolves.toEqual({
      tasks: [],
      taskListId: "list-1",
    });
    await expect(provider.getTasks()).resolves.toEqual({ tasks: [], taskListId: "" });
    await expect(provider.createTask({ taskListId: "list-1", title: "Task" })).resolves.toEqual({
      success: false,
      error: "Google Tasks non configurato",
    });
    await expect(
      provider.updateTask({ taskListId: "list-1", taskId: "task-1", completed: true }),
    ).resolves.toEqual({
      success: false,
      error: "Google Tasks non configurato",
    });
    await expect(provider.deleteTask("list-1", "task-1")).resolves.toEqual({
      success: false,
      error: "Google Tasks non configurato",
    });
    await expect(provider.clearCompletedTasks("list-1")).resolves.toEqual({
      success: false,
      error: "Google Tasks non configurato",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
