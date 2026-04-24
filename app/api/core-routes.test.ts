// used the fkg testing skill zioo
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  jsonError: vi.fn((status: number, body: Record<string, unknown>) =>
    Response.json({ success: false, ...body }, { status }),
  ),
  getAuthContext: vi.fn(),
  createClient: vi.fn(),
}));

const nextHeadersMocks = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

const tasksMocks = vi.hoisted(() => ({
  handleGetTasks: vi.fn(),
  handleCreateTask: vi.fn(),
  handleUpdateTask: vi.fn(),
  handleDeleteTask: vi.fn(),
}));

const calendarMocks = vi.hoisted(() => ({
  handleGetCalendarEvents: vi.fn(),
  handleCreateCalendarEvent: vi.fn(),
  handleUpdateCalendarEvent: vi.fn(),
  handleDeleteCalendarEvent: vi.fn(),
}));

const chatsMocks = vi.hoisted(() => ({
  getChatsUnauthorizedResponse: vi.fn(),
  handleGetChats: vi.fn(),
  handleCreateChat: vi.fn(),
  handleAppendChat: vi.fn(),
  handleDeleteChat: vi.fn(),
}));

vi.mock("next/headers", () => nextHeadersMocks);
vi.mock("@/app/_server", () => serverMocks);
vi.mock("@/app/_features/tasks", () => tasksMocks);
vi.mock("@/app/_features/calendar", () => calendarMocks);
vi.mock("@/app/_features/chats", () => chatsMocks);

import * as authCallbackRoute from "./auth/callback/google/route";
import * as authGoogleRoute from "./auth/google/route";
import * as calendarRoute from "./calendar/events/route";
import * as chatsRoute from "./chats/route";
import * as supabaseAuthCallbackRoute from "../auth/callback/route";
import * as tasksRoute from "./tasks/route";

function createJsonResponse(body: Record<string, unknown>, status: number = 200): Response {
  return Response.json(body, { status });
}

function createAuthSupabase(userId: string | null = "user-1", error: Error | null = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error,
      }),
      exchangeCodeForSession: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  serverMocks.jsonError.mockImplementation((status: number, body: Record<string, unknown>) =>
    Response.json({ success: false, ...body }, { status }),
  );
  nextHeadersMocks.cookies.mockResolvedValue({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  });
});

describe("tasks route", () => {
  it("forwards GET requests to the tasks handler", async () => {
    tasksMocks.handleGetTasks.mockResolvedValue(
      createJsonResponse({ success: true, todos: [{ id: "1" }] }),
    );

    const response = await tasksRoute.GET();

    expect(tasksMocks.handleGetTasks).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      success: true,
      todos: [{ id: "1" }],
    });
  });

  it("reads the JSON body for POST and PATCH", async () => {
    tasksMocks.handleCreateTask.mockResolvedValue(createJsonResponse({ success: true }, 201));
    tasksMocks.handleUpdateTask.mockResolvedValue(createJsonResponse({ success: true }));

    const postResponse = await tasksRoute.POST(
      new NextRequest("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ text: "Scrivi test" }),
      }),
    );
    const patchResponse = await tasksRoute.PATCH(
      new NextRequest("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "1", completed: true }),
      }),
    );

    expect(tasksMocks.handleCreateTask).toHaveBeenCalledWith({ text: "Scrivi test" });
    expect(tasksMocks.handleUpdateTask).toHaveBeenCalledWith({ id: "1", completed: true });
    expect(postResponse.status).toBe(201);
    expect(patchResponse.status).toBe(200);
  });

  it("falls back to an empty object when DELETE has no body", async () => {
    tasksMocks.handleDeleteTask.mockResolvedValue(
      createJsonResponse({ success: true, deletedIds: ["1"] }),
    );

    const request = new NextRequest("http://localhost/api/tasks?id=1", {
      method: "DELETE",
    });
    const response = await tasksRoute.DELETE(request);

    expect(tasksMocks.handleDeleteTask).toHaveBeenCalledWith(
      {},
      request.nextUrl.searchParams,
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedIds: ["1"],
    });
  });

  it("normalizes execution errors", async () => {
    tasksMocks.handleGetTasks.mockRejectedValue(new Error("boom"));
    tasksMocks.handleUpdateTask.mockRejectedValue("boom");

    const getResponse = await tasksRoute.GET();
    const patchResponse = await tasksRoute.PATCH(
      new NextRequest("http://localhost/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: "1" }),
      }),
    );

    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(1, 500, {
      error: "EXECUTION_ERROR",
      message: "boom",
      errorMessage: "boom",
      todos: [],
    });
    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(2, 500, {
      error: "EXECUTION_ERROR",
      errorMessage: "Errore sconosciuto",
    });
    expect(getResponse.status).toBe(500);
    expect(patchResponse.status).toBe(500);
  });

  it("normalizes POST and DELETE task failures", async () => {
    tasksMocks.handleCreateTask.mockRejectedValue(new Error("create failed"));
    tasksMocks.handleDeleteTask.mockRejectedValue("delete failed");

    const postResponse = await tasksRoute.POST(
      new NextRequest("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ text: "Scrivi test" }),
      }),
    );
    const deleteResponse = await tasksRoute.DELETE(
      new NextRequest("http://localhost/api/tasks?id=1", {
        method: "DELETE",
      }),
    );

    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(1, 500, {
      error: "EXECUTION_ERROR",
      errorMessage: "create failed",
    });
    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(2, 500, {
      error: "EXECUTION_ERROR",
      errorMessage: "Errore sconosciuto",
    });
    expect(postResponse.status).toBe(500);
    expect(deleteResponse.status).toBe(500);
  });
});

describe("calendar route", () => {
  it("forwards all methods to the calendar handlers", async () => {
    calendarMocks.handleGetCalendarEvents.mockResolvedValue(
      createJsonResponse({ success: true, events: [] }),
    );
    calendarMocks.handleCreateCalendarEvent.mockResolvedValue(
      createJsonResponse({ success: true }, 201),
    );
    calendarMocks.handleUpdateCalendarEvent.mockResolvedValue(
      createJsonResponse({ success: true }),
    );
    calendarMocks.handleDeleteCalendarEvent.mockResolvedValue(
      createJsonResponse({ success: true }),
    );

    const getRequest = new NextRequest("http://localhost/api/calendar/events?daysAhead=7");
    const deleteRequest = new NextRequest("http://localhost/api/calendar/events?id=evt-1", {
      method: "DELETE",
    });

    await calendarRoute.GET(getRequest);
    await calendarRoute.POST(
      new NextRequest("http://localhost/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title: "Call" }),
      }),
    );
    await calendarRoute.PATCH(
      new NextRequest("http://localhost/api/calendar/events", {
        method: "PATCH",
        body: JSON.stringify({ eventId: "evt-1" }),
      }),
    );
    await calendarRoute.DELETE(deleteRequest);

    expect(calendarMocks.handleGetCalendarEvents).toHaveBeenCalledWith(
      getRequest.nextUrl.searchParams,
    );
    expect(calendarMocks.handleCreateCalendarEvent).toHaveBeenCalledWith({ title: "Call" });
    expect(calendarMocks.handleUpdateCalendarEvent).toHaveBeenCalledWith({ eventId: "evt-1" });
    expect(calendarMocks.handleDeleteCalendarEvent).toHaveBeenCalledWith(
      deleteRequest.nextUrl.searchParams,
    );
  });

  it("wraps calendar handler failures with route-specific messages", async () => {
    calendarMocks.handleGetCalendarEvents.mockRejectedValue(new Error("read failed"));
    calendarMocks.handleCreateCalendarEvent.mockRejectedValue(new Error("create failed"));
    calendarMocks.handleUpdateCalendarEvent.mockRejectedValue("update failed");
    calendarMocks.handleDeleteCalendarEvent.mockRejectedValue(new Error("delete failed"));

    const getResponse = await calendarRoute.GET(
      new NextRequest("http://localhost/api/calendar/events"),
    );
    const postResponse = await calendarRoute.POST(
      new NextRequest("http://localhost/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title: "Call" }),
      }),
    );
    const patchResponse = await calendarRoute.PATCH(
      new NextRequest("http://localhost/api/calendar/events", {
        method: "PATCH",
        body: JSON.stringify({ eventId: "evt-1" }),
      }),
    );
    const deleteResponse = await calendarRoute.DELETE(
      new NextRequest("http://localhost/api/calendar/events?id=evt-1", {
        method: "DELETE",
      }),
    );

    await expect(getResponse.json()).resolves.toMatchObject({
      errorMessage: "Si è verificato un errore nel leggere il calendario: read failed",
    });
    await expect(postResponse.json()).resolves.toMatchObject({
      errorMessage: "Si è verificato un errore durante la creazione dell'evento: create failed",
    });
    await expect(patchResponse.json()).resolves.toMatchObject({
      errorMessage:
        "Si è verificato un errore durante l'aggiornamento dell'evento: Errore sconosciuto",
    });
    await expect(deleteResponse.json()).resolves.toMatchObject({
      errorMessage: "Si è verificato un errore durante l'eliminazione dell'evento: delete failed",
    });
  });
});

describe("chats route", () => {
  it("returns the unauthorized response when auth is missing", async () => {
    const unauthorized = createJsonResponse(
      { success: false, error: "UNAUTHORIZED" },
      401,
    );
    serverMocks.getAuthContext.mockResolvedValue(null);
    chatsMocks.getChatsUnauthorizedResponse.mockReturnValue(unauthorized);

    const response = await chatsRoute.GET(new NextRequest("http://localhost/api/chats"));

    expect(chatsMocks.getChatsUnauthorizedResponse).toHaveBeenCalledOnce();
    expect(response.status).toBe(401);
  });

  it("delegates authenticated requests and falls back to empty bodies where expected", async () => {
    serverMocks.getAuthContext.mockResolvedValue({ userId: "user-1" });
    chatsMocks.handleGetChats.mockResolvedValue(createJsonResponse({ success: true, chats: [] }));
    chatsMocks.handleCreateChat.mockResolvedValue(createJsonResponse({ success: true }, 201));
    chatsMocks.handleAppendChat.mockResolvedValue(createJsonResponse({ success: true }));
    chatsMocks.handleDeleteChat.mockResolvedValue(createJsonResponse({ success: true }));

    const getRequest = new NextRequest("http://localhost/api/chats?limit=10");
    const postRequest = new NextRequest("http://localhost/api/chats", {
      method: "POST",
    });
    const patchRequest = new NextRequest("http://localhost/api/chats", {
      method: "PATCH",
      body: JSON.stringify({ id: "chat-1", turns: [] }),
    });
    const deleteRequest = new NextRequest("http://localhost/api/chats?id=chat-1", {
      method: "DELETE",
    });

    await chatsRoute.GET(getRequest);
    await chatsRoute.POST(postRequest);
    await chatsRoute.PATCH(patchRequest);
    await chatsRoute.DELETE(deleteRequest);

    expect(chatsMocks.handleGetChats).toHaveBeenCalledWith(
      { userId: "user-1" },
      getRequest.nextUrl.searchParams,
    );
    expect(chatsMocks.handleCreateChat).toHaveBeenCalledWith({ userId: "user-1" }, {});
    expect(chatsMocks.handleAppendChat).toHaveBeenCalledWith(
      { userId: "user-1" },
      { id: "chat-1", turns: [] },
    );
    expect(chatsMocks.handleDeleteChat).toHaveBeenCalledWith(
      { userId: "user-1" },
      {},
      deleteRequest.nextUrl.searchParams,
    );
  });

  it("normalizes execution errors", async () => {
    serverMocks.getAuthContext.mockRejectedValue(new Error("auth exploded"));

    const response = await chatsRoute.GET(new NextRequest("http://localhost/api/chats"));

    expect(serverMocks.jsonError).toHaveBeenCalledWith(500, {
      error: "EXECUTION_ERROR",
      message: "auth exploded",
    });
    expect(response.status).toBe(500);
  });

  it("returns the unauthorized response for non-GET chat routes too", async () => {
    const unauthorized = createJsonResponse(
      { success: false, error: "UNAUTHORIZED" },
      401,
    );
    serverMocks.getAuthContext.mockResolvedValue(null);
    chatsMocks.getChatsUnauthorizedResponse.mockReturnValue(unauthorized);

    const postResponse = await chatsRoute.POST(
      new NextRequest("http://localhost/api/chats", {
        method: "POST",
      }),
    );
    const patchResponse = await chatsRoute.PATCH(
      new NextRequest("http://localhost/api/chats", {
        method: "PATCH",
        body: JSON.stringify({ id: "chat-1", turns: [] }),
      }),
    );
    const deleteResponse = await chatsRoute.DELETE(
      new NextRequest("http://localhost/api/chats?id=chat-1", {
        method: "DELETE",
      }),
    );

    expect(postResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
  });

  it("normalizes POST, PATCH and DELETE chat failures", async () => {
    serverMocks.getAuthContext.mockResolvedValue({ userId: "user-1" });
    chatsMocks.handleCreateChat.mockRejectedValueOnce(new Error("create exploded"));
    chatsMocks.handleAppendChat.mockRejectedValueOnce("append exploded");
    chatsMocks.handleDeleteChat.mockRejectedValueOnce("delete exploded");

    const postResponse = await chatsRoute.POST(
      new NextRequest("http://localhost/api/chats", {
        method: "POST",
      }),
    );
    const patchResponse = await chatsRoute.PATCH(
      new NextRequest("http://localhost/api/chats", {
        method: "PATCH",
        body: JSON.stringify({ id: "chat-1", turns: [] }),
      }),
    );
    const deleteResponse = await chatsRoute.DELETE(
      new NextRequest("http://localhost/api/chats?id=chat-1", {
        method: "DELETE",
      }),
    );

    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(1, 500, {
      error: "EXECUTION_ERROR",
      message: "create exploded",
    });
    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(2, 500, {
      error: "EXECUTION_ERROR",
      message: "Errore sconosciuto",
    });
    expect(serverMocks.jsonError).toHaveBeenNthCalledWith(3, 500, {
      error: "EXECUTION_ERROR",
      message: "Errore sconosciuto",
    });
    expect(postResponse.status).toBe(500);
    expect(patchResponse.status).toBe(500);
    expect(deleteResponse.status).toBe(500);
  });
});

describe("Google auth routes", () => {
  it("redirects to the Google OAuth URL", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "google-client");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://jarvis.example");

    const response = await authGoogleRoute.GET();
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(location).toContain("client_id=google-client");
    expect(location).toContain(
      "redirect_uri=https%3A%2F%2Fjarvis.example%2Fapi%2Fauth%2Fcallback%2Fgoogle",
    );
  });

  it("returns a 500 JSON response when the Google client id is missing", async () => {
    const response = await authGoogleRoute.GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "GOOGLE_CALENDAR_CLIENT_ID non configurato nel .env.local",
    });
  });

  it("handles Google OAuth callback edge cases and token exchange", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://jarvis.example");
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret");

    const errorResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?error=access_denied"),
    );
    const missingCodeResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google"),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: vi.fn().mockResolvedValue("oauth failure"),
    });
    const exchangeFailureResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?code=abc"),
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        refresh_token: "refresh-token",
        access_token: "access-token",
      }),
    });
    const successResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?code=xyz"),
    );

    expect(errorResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?error=access_denied",
    );
    expect(missingCodeResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?error=Codice%20di%20autorizzazione%20mancante",
    );
    expect(exchangeFailureResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?error=Errore%20durante%20lo%20scambio%20del%20codice",
    );
    expect(successResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?success=true&refresh_token=refresh-token&access_token=access-token",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles missing OAuth config, missing refresh token and unexpected callback errors", async () => {
    const fetchMock = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);

    const missingConfigResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?code=abc"),
    );

    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_SECRET", "client-secret");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        access_token: "access-token",
      }),
    });
    const missingRefreshTokenResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?code=abc"),
    );

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const unexpectedErrorResponse = await authCallbackRoute.GET(
      new Request("https://jarvis.example/api/auth/callback/google?code=def"),
    );

    expect(missingConfigResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?error=Credenziali%20OAuth%20non%20configurate",
    );
    expect(missingRefreshTokenResponse.headers.get("location")).toContain(
      "Refresh%20token%20non%20ricevuto",
    );
    expect(unexpectedErrorResponse.headers.get("location")).toBe(
      "https://jarvis.example/setup/calendar?error=Errore%20imprevisto%20durante%20l%27autenticazione",
    );
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("Supabase auth callback route", () => {
  it("redirects with the auth error when Supabase returns an OAuth error", async () => {
    const response = await supabaseAuthCallbackRoute.GET(
      new Request(
        "https://jarvis.example/auth/callback?error=access_denied&error_description=Denied",
      ),
    );

    expect(response.headers.get("location")).toBe("https://jarvis.example/?error=Denied");
  });

  it("handles missing code, exchange errors and successful redirects", async () => {
    const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
    nextHeadersMocks.cookies.mockResolvedValue(cookieStore);

    const missingCodeResponse = await supabaseAuthCallbackRoute.GET(
      new Request("https://jarvis.example/auth/callback"),
    );

    const failingSupabase = createAuthSupabase();
    failingSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error("bad code"),
    });
    serverMocks.createClient.mockReturnValueOnce(failingSupabase);
    const exchangeFailureResponse = await supabaseAuthCallbackRoute.GET(
      new Request("https://jarvis.example/auth/callback?code=abc"),
    );

    const successfulSupabase = createAuthSupabase();
    successfulSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      error: null,
    });
    serverMocks.createClient.mockReturnValueOnce(successfulSupabase);
    const successResponse = await supabaseAuthCallbackRoute.GET(
      new Request("https://jarvis.example/auth/callback?code=xyz&next=assistant"),
    );

    expect(missingCodeResponse.headers.get("location")).toBe(
      "https://jarvis.example/?error=Codice%20di%20autorizzazione%20mancante",
    );
    expect(exchangeFailureResponse.headers.get("location")).toBe(
      "https://jarvis.example/?error=bad%20code",
    );
    expect(successResponse.headers.get("location")).toBe("https://jarvis.example/assistant");
    expect(serverMocks.createClient).toHaveBeenCalledWith(cookieStore);
  });
});
