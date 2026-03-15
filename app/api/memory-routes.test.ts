// used the fkg testing skill zioo
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

const nextHeadersMocks = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

const memoryMocks = vi.hoisted(() => ({
  createEpisodicMemory: vi.fn(),
  getEpisodicMemories: vi.fn(),
  getEpisodicMemoryById: vi.fn(),
  updateEpisodicMemory: vi.fn(),
  deleteEpisodicMemory: vi.fn(),
  searchEpisodicMemoriesByContent: vi.fn(),
  createSemanticMemory: vi.fn(),
  getSemanticMemories: vi.fn(),
  getSemanticMemoryById: vi.fn(),
  updateSemanticMemory: vi.fn(),
  deleteSemanticMemory: vi.fn(),
  searchSemanticMemoriesByContent: vi.fn(),
}));

vi.mock("next/headers", () => nextHeadersMocks);
vi.mock("@/app/_server", () => serverMocks);
vi.mock("@/app/_features/memory", () => memoryMocks);

import * as episodicRoute from "./memory/episodic/route";
import * as episodicSearchRoute from "./memory/episodic/search/route";
import * as semanticRoute from "./memory/semantic/route";
import * as semanticSearchRoute from "./memory/semantic/search/route";

function setAuthorizedUser(userId: string = "user-1") {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: userId,
          },
        },
        error: null,
      }),
    },
  };

  serverMocks.createClient.mockReturnValue(supabase);
  return supabase;
}

function setUnauthorizedUser() {
  serverMocks.createClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error("unauthorized"),
      }),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  nextHeadersMocks.cookies.mockResolvedValue({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  });
});

describe("episodic memory route", () => {
  it("returns 401 when the user is not authenticated", async () => {
    setUnauthorizedUser();

    const response = await episodicRoute.GET(
      new NextRequest("http://localhost/api/memory/episodic"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "UNAUTHORIZED",
      message: "Utente non autenticato",
    });
  });

  it("lists and fetches episodic memories", async () => {
    const supabase = setAuthorizedUser();
    memoryMocks.getEpisodicMemories.mockResolvedValue({
      success: true,
      memories: [
        {
          id: "mem-1",
          content: "Ricordo",
          importance: "medium",
          metadata: { source: "test" },
          ttl_days: 30,
          user_id: "user-1",
          created_at: "2026-03-15T10:00:00.000Z",
        },
      ],
    });
    memoryMocks.getEpisodicMemoryById.mockResolvedValue({
      success: true,
      memory: {
        id: "mem-2",
        content: "Singolo ricordo",
        importance: "high",
        metadata: null,
        ttl_days: 7,
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
      },
    });

    const listResponse = await episodicRoute.GET(
      new NextRequest("http://localhost/api/memory/episodic"),
    );
    const itemResponse = await episodicRoute.GET(
      new NextRequest("http://localhost/api/memory/episodic?id=mem-2"),
    );

    expect(memoryMocks.getEpisodicMemories).toHaveBeenCalledWith(supabase, "user-1");
    expect(memoryMocks.getEpisodicMemoryById).toHaveBeenCalledWith(supabase, "user-1", "mem-2");
    await expect(listResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
      memories: [{ id: "mem-1", content: "Ricordo" }],
    });
    await expect(itemResponse.json()).resolves.toMatchObject({
      success: true,
      memory: { id: "mem-2", content: "Singolo ricordo" },
    });
  });

  it("maps episodic POST, PATCH and DELETE success paths", async () => {
    const supabase = setAuthorizedUser();
    memoryMocks.createEpisodicMemory.mockResolvedValue({
      success: true,
      memory: {
        id: "mem-3",
        content: "Nuovo ricordo",
        importance: "medium",
        metadata: {},
        ttl_days: 14,
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
      },
    });
    memoryMocks.updateEpisodicMemory.mockResolvedValue({
      success: true,
      memory: {
        id: "mem-3",
        content: "Ricordo aggiornato",
        importance: "high",
        metadata: {},
        ttl_days: 14,
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
      },
    });
    memoryMocks.deleteEpisodicMemory.mockResolvedValue({
      success: true,
    });

    const postResponse = await episodicRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "POST",
        body: JSON.stringify({ content: "Nuovo ricordo" }),
      }),
    );
    const patchResponse = await episodicRoute.PATCH(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "PATCH",
        body: JSON.stringify({ id: " mem-3 ", content: "Ricordo aggiornato" }),
      }),
    );
    const deleteResponse = await episodicRoute.DELETE(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "DELETE",
        body: JSON.stringify({ id: " mem-3 " }),
      }),
    );

    expect(memoryMocks.createEpisodicMemory).toHaveBeenCalledWith(
      supabase,
      "user-1",
      { content: "Nuovo ricordo" },
    );
    expect(memoryMocks.updateEpisodicMemory).toHaveBeenCalledWith(
      supabase,
      "user-1",
      "mem-3",
      { content: "Ricordo aggiornato" },
    );
    expect(memoryMocks.deleteEpisodicMemory).toHaveBeenCalledWith(supabase, "user-1", "mem-3");
    expect(postResponse.status).toBe(200);
    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
  });

  it("maps episodic validation and error branches", async () => {
    setAuthorizedUser();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    memoryMocks.getEpisodicMemoryById.mockResolvedValue({
      success: false,
      error: "Record non trovato",
    });
    memoryMocks.createEpisodicMemory.mockResolvedValue({
      success: false,
      error: "Il contenuto non può essere vuoto",
    });
    memoryMocks.updateEpisodicMemory.mockResolvedValue({
      success: false,
      error: "Nessun campo da aggiornare",
    });
    memoryMocks.deleteEpisodicMemory.mockResolvedValue({
      success: false,
      error: "Delete failed",
    });

    const missingIdResponse = await episodicRoute.PATCH(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "PATCH",
        body: JSON.stringify({ content: "ciao" }),
      }),
    );
    const notFoundResponse = await episodicRoute.GET(
      new NextRequest("http://localhost/api/memory/episodic?id=mem-404"),
    );
    const invalidCreateResponse = await episodicRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "POST",
        body: JSON.stringify({ content: "" }),
      }),
    );
    const invalidUpdateResponse = await episodicRoute.PATCH(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "PATCH",
        body: JSON.stringify({ id: "mem-1" }),
      }),
    );
    const invalidDeleteResponse = await episodicRoute.DELETE(
      new NextRequest("http://localhost/api/memory/episodic", {
        method: "DELETE",
      }),
    );
    const deleteFailureResponse = await episodicRoute.DELETE(
      new NextRequest("http://localhost/api/memory/episodic?id=mem-1", {
        method: "DELETE",
      }),
    );

    memoryMocks.getEpisodicMemories.mockRejectedValueOnce(new Error("db down"));
    const exceptionResponse = await episodicRoute.GET(
      new NextRequest("http://localhost/api/memory/episodic"),
    );

    expect(missingIdResponse.status).toBe(400);
    expect(notFoundResponse.status).toBe(404);
    expect(invalidCreateResponse.status).toBe(400);
    expect(invalidUpdateResponse.status).toBe(400);
    expect(invalidDeleteResponse.status).toBe(400);
    expect(deleteFailureResponse.status).toBe(500);
    expect(exceptionResponse.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("episodic memory search route", () => {
  it("validates the search query and returns the search results", async () => {
    const supabase = setAuthorizedUser();
    memoryMocks.searchEpisodicMemoriesByContent.mockResolvedValue({
      success: true,
      memories: [{ id: "mem-1" }],
    });

    const missingQueryResponse = await episodicSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic/search", {
        method: "POST",
        body: JSON.stringify({ query: " " }),
      }),
    );
    const successResponse = await episodicSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic/search", {
        method: "POST",
        body: JSON.stringify({ query: "vacanza", match_count: 3 }),
      }),
    );

    expect(missingQueryResponse.status).toBe(400);
    expect(memoryMocks.searchEpisodicMemoriesByContent).toHaveBeenCalledWith(
      supabase,
      "user-1",
      "vacanza",
      3,
    );
    await expect(successResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
    });
  });

  it("handles search failures and thrown exceptions", async () => {
    setAuthorizedUser();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    memoryMocks.searchEpisodicMemoriesByContent.mockResolvedValueOnce({
      success: false,
      error: "rpc failed",
    });
    memoryMocks.searchEpisodicMemoriesByContent.mockRejectedValueOnce(new Error("db down"));

    const failureResponse = await episodicSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic/search", {
        method: "POST",
        body: JSON.stringify({ query: "vacanza" }),
      }),
    );
    const exceptionResponse = await episodicSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/episodic/search", {
        method: "POST",
        body: JSON.stringify({ query: "vacanza" }),
      }),
    );

    expect(failureResponse.status).toBe(500);
    expect(exceptionResponse.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("semantic memory route", () => {
  it("lists, reads and mutates semantic memories", async () => {
    const supabase = setAuthorizedUser();
    memoryMocks.getSemanticMemories.mockResolvedValue({
      success: true,
      memories: [
        {
          id: "sem-1",
          content: "Concetto",
          key: "idea",
          importance: "medium",
          user_id: "user-1",
          created_at: "2026-03-15T10:00:00.000Z",
          updated_at: "2026-03-15T10:00:00.000Z",
        },
      ],
    });
    memoryMocks.getSemanticMemoryById.mockResolvedValue({
      success: true,
      memory: {
        id: "sem-2",
        content: "Dettaglio",
        key: null,
        importance: "high",
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
        updated_at: "2026-03-15T10:00:00.000Z",
      },
    });
    memoryMocks.createSemanticMemory.mockResolvedValue({
      success: true,
      memory: {
        id: "sem-3",
        content: "Nuovo concetto",
        key: "nuovo",
        importance: "low",
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
        updated_at: "2026-03-15T10:00:00.000Z",
      },
    });
    memoryMocks.updateSemanticMemory.mockResolvedValue({
      success: true,
      memory: {
        id: "sem-3",
        content: "Concetto aggiornato",
        key: "aggiornato",
        importance: "medium",
        user_id: "user-1",
        created_at: "2026-03-15T10:00:00.000Z",
        updated_at: "2026-03-15T10:00:00.000Z",
      },
    });
    memoryMocks.deleteSemanticMemory.mockResolvedValue({
      success: true,
    });

    const listResponse = await semanticRoute.GET(
      new NextRequest("http://localhost/api/memory/semantic"),
    );
    const itemResponse = await semanticRoute.GET(
      new NextRequest("http://localhost/api/memory/semantic?id=sem-2"),
    );
    const postResponse = await semanticRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "POST",
        body: JSON.stringify({ content: "Nuovo concetto" }),
      }),
    );
    const patchResponse = await semanticRoute.PATCH(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "PATCH",
        body: JSON.stringify({ id: " sem-3 ", key: "aggiornato" }),
      }),
    );
    const deleteResponse = await semanticRoute.DELETE(
      new NextRequest("http://localhost/api/memory/semantic?id= sem-3 ", {
        method: "DELETE",
      }),
    );

    expect(memoryMocks.getSemanticMemories).toHaveBeenCalledWith(supabase, "user-1");
    expect(memoryMocks.getSemanticMemoryById).toHaveBeenCalledWith(supabase, "user-1", "sem-2");
    expect(memoryMocks.updateSemanticMemory).toHaveBeenCalledWith(
      supabase,
      "user-1",
      "sem-3",
      { key: "aggiornato" },
    );
    expect(memoryMocks.deleteSemanticMemory).toHaveBeenCalledWith(supabase, "user-1", "sem-3");
    expect(listResponse.status).toBe(200);
    expect(itemResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
  });

  it("maps semantic validation and error branches", async () => {
    setAuthorizedUser();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    memoryMocks.getSemanticMemoryById.mockResolvedValue({
      success: false,
      error: "Record non trovato",
    });
    memoryMocks.createSemanticMemory.mockResolvedValue({
      success: false,
      error: "Il contenuto non può essere vuoto",
    });
    memoryMocks.updateSemanticMemory.mockResolvedValue({
      success: false,
      error: "Il contenuto non può essere vuoto",
    });
    memoryMocks.deleteSemanticMemory.mockResolvedValue({
      success: false,
      error: "Delete failed",
    });

    const missingIdResponse = await semanticRoute.PATCH(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "PATCH",
        body: JSON.stringify({ content: "ciao" }),
      }),
    );
    const notFoundResponse = await semanticRoute.GET(
      new NextRequest("http://localhost/api/memory/semantic?id=sem-404"),
    );
    const invalidCreateResponse = await semanticRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "POST",
        body: JSON.stringify({ content: "" }),
      }),
    );
    const invalidUpdateResponse = await semanticRoute.PATCH(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "PATCH",
        body: JSON.stringify({ id: "sem-1", content: "" }),
      }),
    );
    const invalidDeleteResponse = await semanticRoute.DELETE(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "DELETE",
      }),
    );
    const deleteFailureResponse = await semanticRoute.DELETE(
      new NextRequest("http://localhost/api/memory/semantic?id=sem-1", {
        method: "DELETE",
      }),
    );

    memoryMocks.getSemanticMemories.mockRejectedValueOnce(new Error("db down"));
    const exceptionResponse = await semanticRoute.GET(
      new NextRequest("http://localhost/api/memory/semantic"),
    );

    expect(missingIdResponse.status).toBe(400);
    expect(notFoundResponse.status).toBe(404);
    expect(invalidCreateResponse.status).toBe(400);
    expect(invalidUpdateResponse.status).toBe(400);
    expect(invalidDeleteResponse.status).toBe(400);
    expect(deleteFailureResponse.status).toBe(500);
    expect(exceptionResponse.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });

  it("covers remaining semantic route failures and body fallbacks", async () => {
    setAuthorizedUser();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    memoryMocks.getSemanticMemories.mockResolvedValueOnce({
      success: false,
      error: "query failed",
    });
    memoryMocks.createSemanticMemory.mockResolvedValueOnce({
      success: false,
      error: "provider failed",
    });
    memoryMocks.updateSemanticMemory.mockRejectedValueOnce(new Error("patch exploded"));
    memoryMocks.deleteSemanticMemory.mockResolvedValueOnce({
      success: true,
    });
    memoryMocks.deleteSemanticMemory.mockRejectedValueOnce(new Error("delete exploded"));

    const listFailureResponse = await semanticRoute.GET(
      new NextRequest("http://localhost/api/memory/semantic"),
    );
    const createFailureResponse = await semanticRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "POST",
        body: JSON.stringify({ content: "Nuovo concetto" }),
      }),
    );
    const patchErrorResponse = await semanticRoute.PATCH(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "PATCH",
        body: JSON.stringify({ id: "sem-1", key: "nuovo" }),
      }),
    );
    const deleteBodyResponse = await semanticRoute.DELETE(
      new NextRequest("http://localhost/api/memory/semantic", {
        method: "DELETE",
        body: JSON.stringify({ id: " sem-body " }),
      }),
    );
    const deleteErrorResponse = await semanticRoute.DELETE(
      new NextRequest("http://localhost/api/memory/semantic?id=sem-1", {
        method: "DELETE",
      }),
    );

    expect(listFailureResponse.status).toBe(500);
    await expect(listFailureResponse.json()).resolves.toMatchObject({
      success: false,
      error: "EXECUTION_ERROR",
      message: "query failed",
    });

    expect(createFailureResponse.status).toBe(500);
    await expect(createFailureResponse.json()).resolves.toMatchObject({
      success: false,
      error: "CREATION_FAILED",
      message: "provider failed",
    });

    expect(patchErrorResponse.status).toBe(500);
    await expect(patchErrorResponse.json()).resolves.toMatchObject({
      success: false,
      error: "EXECUTION_ERROR",
      message: "patch exploded",
    });

    expect(deleteBodyResponse.status).toBe(200);
    expect(memoryMocks.deleteSemanticMemory).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "user-1",
      "sem-body",
    );

    expect(deleteErrorResponse.status).toBe(500);
    await expect(deleteErrorResponse.json()).resolves.toMatchObject({
      success: false,
      error: "EXECUTION_ERROR",
      message: "delete exploded",
    });

    expect(consoleError).toHaveBeenCalledTimes(2);
  });
});

describe("semantic memory search route", () => {
  it("validates the query and returns semantic search results", async () => {
    const supabase = setAuthorizedUser();
    memoryMocks.searchSemanticMemoriesByContent.mockResolvedValue({
      success: true,
      memories: [{ id: "sem-1" }],
    });

    const missingQueryResponse = await semanticSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic/search", {
        method: "POST",
        body: JSON.stringify({ query: " " }),
      }),
    );
    const successResponse = await semanticSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic/search", {
        method: "POST",
        body: JSON.stringify({ query: "concetto" }),
      }),
    );

    expect(missingQueryResponse.status).toBe(400);
    expect(memoryMocks.searchSemanticMemoriesByContent).toHaveBeenCalledWith(
      supabase,
      "user-1",
      "concetto",
      5,
    );
    await expect(successResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
    });
  });

  it("handles semantic search failures and thrown exceptions", async () => {
    setAuthorizedUser();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    memoryMocks.searchSemanticMemoriesByContent.mockResolvedValueOnce({
      success: false,
      error: "rpc failed",
    });
    memoryMocks.searchSemanticMemoriesByContent.mockRejectedValueOnce(new Error("db down"));

    const failureResponse = await semanticSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic/search", {
        method: "POST",
        body: JSON.stringify({ query: "concetto" }),
      }),
    );
    const exceptionResponse = await semanticSearchRoute.POST(
      new NextRequest("http://localhost/api/memory/semantic/search", {
        method: "POST",
        body: JSON.stringify({ query: "concetto" }),
      }),
    );

    expect(failureResponse.status).toBe(500);
    expect(exceptionResponse.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
  });
});
