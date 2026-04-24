// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  appendToChat: vi.fn(),
  createChat: vi.fn(),
  deleteChat: vi.fn(),
  getChatById: vi.fn(),
  getChats: vi.fn(),
  searchChatsSemantic: vi.fn(),
}));

vi.mock("./chats.service", () => serviceMocks);

import type { AuthContext } from "@/app/_server/http/auth";
import {
  getChatsUnauthorizedResponse,
  handleAppendChat,
  handleCreateChat,
  handleDeleteChat,
  handleGetChats,
} from "./chats-route.handlers";

const auth = {
  supabase: {} as AuthContext["supabase"],
  userId: "user-1",
} satisfies AuthContext;

const chatId = "123e4567-e89b-12d3-a456-426614174000";

describe("chats route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a standardized unauthorized response", async () => {
    const response = getChatsUnauthorizedResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "UNAUTHORIZED",
    });
  });

  it("validates queries and handles get-by-id, search and list branches", async () => {
    const invalidResponse = await handleGetChats(auth, new URLSearchParams(`id=${chatId}&search=test`));

    serviceMocks.getChatById.mockResolvedValueOnce({
      success: true,
      chat: {
        id: chatId,
        user_id: "user-1",
        title: "Chat",
        full_history: "bad",
        assistant_history: [{ role: "user", parts: [{ text: "ciao" }] }],
        summary_text: null,
        last_activity_at: "2026-03-15T10:00:00.000Z",
        created_at: "2026-03-15T10:00:00.000Z",
      },
    });
    serviceMocks.searchChatsSemantic.mockResolvedValueOnce({
      success: true,
      matches: [{ chat_id: chatId, title: "Match", summary_text: "", similarity: 0.9, distance: 0.1, last_activity_at: "2026-03-15T10:00:00.000Z" }],
    });
    serviceMocks.getChats.mockResolvedValueOnce({
      success: true,
      chats: [{
        id: chatId,
        user_id: "user-1",
        title: "Chat",
        full_history: [],
        assistant_history: [],
        summary_text: null,
        last_activity_at: "2026-03-15T10:00:00.000Z",
        created_at: "2026-03-15T10:00:00.000Z",
      }],
    });

    const byIdResponse = await handleGetChats(auth, new URLSearchParams(`id=${chatId}`));
    const searchResponse = await handleGetChats(auth, new URLSearchParams("search=project&limit=3"));
    const listResponse = await handleGetChats(auth, new URLSearchParams());

    expect(invalidResponse.status).toBe(400);
    await expect(byIdResponse.json()).resolves.toMatchObject({
      success: true,
      chat: {
        id: chatId,
        full_history: [],
      },
    });
    await expect(searchResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
    });
    await expect(listResponse.json()).resolves.toMatchObject({
      success: true,
      count: 1,
    });
  });

  it("maps GET service failures to the correct HTTP status", async () => {
    serviceMocks.getChatById.mockResolvedValueOnce({
      success: false,
      error: "Chat non trovata",
    });
    serviceMocks.searchChatsSemantic.mockResolvedValueOnce({
      success: false,
      error: "rpc failed",
    });
    serviceMocks.getChats.mockResolvedValueOnce({
      success: false,
      error: "db failed",
    });

    const notFoundResponse = await handleGetChats(auth, new URLSearchParams(`id=${chatId}`));
    const searchFailureResponse = await handleGetChats(auth, new URLSearchParams("search=project"));
    const listFailureResponse = await handleGetChats(auth, new URLSearchParams());

    expect(notFoundResponse.status).toBe(404);
    expect(searchFailureResponse.status).toBe(500);
    expect(listFailureResponse.status).toBe(500);
  });

  it("validates create and append payloads and maps service errors", async () => {
    const invalidCreateResponse = await handleCreateChat(auth, { title: "" });
    const invalidAppendResponse = await handleAppendChat(auth, { id: "bad-id", turns: [] });

    serviceMocks.createChat
      .mockResolvedValueOnce({
        success: false,
        error: "create failed",
      })
      .mockResolvedValueOnce({
        success: true,
        chat: {
          id: chatId,
          user_id: "user-1",
          title: "Chat",
          full_history: [],
          assistant_history: [],
          summary_text: null,
          last_activity_at: "2026-03-15T10:00:00.000Z",
          created_at: "2026-03-15T10:00:00.000Z",
        },
      });
    serviceMocks.appendToChat
      .mockResolvedValueOnce({
        success: false,
        error: "Chat non trovata",
      })
      .mockResolvedValueOnce({
        success: true,
        chat: {
          id: chatId,
          user_id: "user-1",
          title: "Chat",
          full_history: [],
          assistant_history: [],
          summary_text: null,
          last_activity_at: "2026-03-15T10:00:00.000Z",
          created_at: "2026-03-15T10:00:00.000Z",
        },
      });

    const createFailureResponse = await handleCreateChat(auth, { title: "Nuova chat" });
    const createSuccessResponse = await handleCreateChat(auth, {});
    const appendNotFoundResponse = await handleAppendChat(auth, {
      id: chatId,
      turns: [],
    });
    const appendSuccessResponse = await handleAppendChat(auth, {
      id: chatId,
      turns: [],
    });

    expect(invalidCreateResponse.status).toBe(400);
    expect(invalidAppendResponse.status).toBe(400);
    expect(createFailureResponse.status).toBe(500);
    expect(createSuccessResponse.status).toBe(200);
    expect(appendNotFoundResponse.status).toBe(404);
    expect(appendSuccessResponse.status).toBe(200);
  });

  it("validates deletes and maps delete errors", async () => {
    const invalidResponse = await handleDeleteChat(auth, {}, new URLSearchParams());

    serviceMocks.deleteChat
      .mockResolvedValueOnce({
        success: false,
        error: "Chat non trovata",
      })
      .mockResolvedValueOnce({
        success: true,
      });

    const notFoundResponse = await handleDeleteChat(auth, {}, new URLSearchParams(`id=${chatId}`));
    const successResponse = await handleDeleteChat(auth, { id: chatId }, new URLSearchParams());

    expect(invalidResponse.status).toBe(400);
    expect(notFoundResponse.status).toBe(404);
    await expect(successResponse.json()).resolves.toMatchObject({
      success: true,
      deleted: true,
      id: chatId,
    });
  });
});
