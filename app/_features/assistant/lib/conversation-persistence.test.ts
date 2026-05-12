import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConversationTurn } from "./storage";

const USER_TURN: ConversationTurn = {
  role: "user",
  parts: [{ text: "ciao" }],
};

const MODEL_TURN: ConversationTurn = {
  role: "model",
  parts: [{ text: "ciao!" }],
};

const loadChatPersistenceAdapter = async () =>
  import("../runtime/adapters/chat-persistence.adapter");

const loadConversationPersistence = async () => import("./conversation-persistence");

describe("chat persistence adapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("creates, appends and fetches chats through the API", async () => {
    const { appendChatTurns, createChat, fetchChatById } = await loadChatPersistenceAdapter();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, chat: { id: "chat-1" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, chat: { id: "chat-1" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            chat: {
              full_history: [USER_TURN],
              assistant_history: [],
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat([USER_TURN])).resolves.toEqual({
      success: true,
      chat: { id: "chat-1" },
    });
    await expect(appendChatTurns("chat-1", [MODEL_TURN])).resolves.toEqual({
      success: true,
      chat: { id: "chat-1" },
    });
    await expect(fetchChatById("chat id/1")).resolves.toEqual({
      success: true,
      chat: {
        full_history: [USER_TURN],
        assistant_history: [],
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/chats",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: [USER_TURN] }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/chats",
      expect.objectContaining({
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "chat-1", turns: [MODEL_TURN] }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/chats?id=chat%20id%2F1",
      expect.objectContaining({
        credentials: "same-origin",
      }),
    );
  });

  it("returns null on non-ok responses and surfaces delete errors", async () => {
    const { appendChatTurns, createChat, deleteChatById, fetchChatById } =
      await loadChatPersistenceAdapter();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(new Response("fail", { status: 500 }))
      .mockResolvedValueOnce(new Response("fail", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Chat non trovata" }), { status: 404 }),
      )
      .mockResolvedValueOnce(new Response("broken json", { status: 500 }));

    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat([])).resolves.toBeNull();
    await expect(appendChatTurns("chat-1", [])).resolves.toBeNull();
    await expect(fetchChatById("chat-1")).resolves.toBeNull();
    await expect(deleteChatById("chat-1")).resolves.toEqual({
      ok: false,
      message: "Chat non trovata",
    });
    await expect(deleteChatById("chat-2")).resolves.toEqual({
      ok: false,
      message: "Eliminazione fallita",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/chats?id=chat-1",
      expect.objectContaining({
        method: "DELETE",
        credentials: "same-origin",
      }),
    );
  });

  it("gracefully handles fetch failures and invalid success payloads", async () => {
    const { appendChatTurns, createChat, deleteChatById, fetchChatById } =
      await loadChatPersistenceAdapter();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockRejectedValueOnce(new Error("delete offline"));

    vi.stubGlobal("fetch", fetchMock);

    await expect(createChat([USER_TURN])).resolves.toBeNull();
    await expect(appendChatTurns("chat-1", [MODEL_TURN])).resolves.toBeNull();
    await expect(fetchChatById("chat-1")).resolves.toBeNull();
    await expect(deleteChatById("chat-1")).resolves.toEqual({
      ok: false,
      message: "delete offline",
    });
  });
});

describe("conversation persistence helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("delegates public helpers to the assistant chat persistence adapter", async () => {
    const createChatResult = { success: true, chat: { id: "chat-1" } };
    const appendChatTurnsResult = { success: true, chat: { id: "chat-1" } };
    const fetchChatByIdResult = {
      success: true,
      chat: { full_history: [USER_TURN], assistant_history: [MODEL_TURN] },
    };
    const deleteChatByIdResult = { ok: true };

    const createChatMock = vi.fn().mockResolvedValue(createChatResult);
    const appendChatTurnsMock = vi.fn().mockResolvedValue(appendChatTurnsResult);
    const fetchChatByIdMock = vi.fn().mockResolvedValue(fetchChatByIdResult);
    const deleteChatByIdMock = vi.fn().mockResolvedValue(deleteChatByIdResult);

    vi.doMock("../runtime/adapters/chat-persistence.adapter", () => ({
      appendChatTurns: appendChatTurnsMock,
      createChat: createChatMock,
      deleteChatById: deleteChatByIdMock,
      fetchChatById: fetchChatByIdMock,
    }));

    const {
      appendChatTurns,
      createChat,
      deleteChatById,
      fetchChatById,
    } = await loadConversationPersistence();

    await expect(createChat([USER_TURN])).resolves.toBe(createChatResult);
    await expect(appendChatTurns("chat-1", [MODEL_TURN])).resolves.toBe(appendChatTurnsResult);
    await expect(fetchChatById("chat-1")).resolves.toBe(fetchChatByIdResult);
    await expect(deleteChatById("chat-1")).resolves.toBe(deleteChatByIdResult);

    expect(createChatMock).toHaveBeenCalledWith([USER_TURN]);
    expect(appendChatTurnsMock).toHaveBeenCalledWith("chat-1", [MODEL_TURN]);
    expect(fetchChatByIdMock).toHaveBeenCalledWith("chat-1");
    expect(deleteChatByIdMock).toHaveBeenCalledWith("chat-1");
  });
});
