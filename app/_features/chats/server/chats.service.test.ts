// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const chatId = "123e4567-e89b-12d3-a456-426614174000";

interface QueryBuilder {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

function createInsertBuilder(singleResult: unknown): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(singleResult),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as QueryBuilder;
  builder.insert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  return builder;
}

function createSelectBuilder(result: unknown, mode: "maybeSingle" | "order"): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as QueryBuilder;
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  if (mode === "maybeSingle") {
    builder.maybeSingle.mockResolvedValue(result);
  } else {
    builder.order.mockResolvedValue(result);
  }
  return builder;
}

function createUpdateBuilder(singleResult: unknown): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(singleResult),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as QueryBuilder;
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return builder;
}

function createDeleteBuilder(result: unknown): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as QueryBuilder;
  builder.delete.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe("chats.service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates chats and surfaces insert errors", async () => {
    vi.doMock("@/app/_features/assistant", () => ({
      SUMMARY_WINDOW_SIZE: 3,
      createSummaryTurn: vi.fn((text: string) => ({
        role: "model",
        parts: [{ text }],
      })),
    }));
    vi.doMock("@/app/_server/ai/llm", () => ({
      generateSummaryFromTurns: vi.fn(),
      generateChatSummaryForSearch: vi.fn(),
      generateChatTitle: vi.fn(),
    }));
    vi.doMock("@/app/_server/ai/embeddings", () => ({
      embed: vi.fn(),
    }));

    const successBuilder = createInsertBuilder({
      data: { id: chatId, title: null },
      error: null,
    });
    const failureBuilder = createInsertBuilder({
      data: null,
      error: { message: "insert failed" },
    });

    const { createChat } = await import("./chats.service");

    const successSupabase = {
      from: vi.fn(() => successBuilder),
    };
    const failureSupabase = {
      from: vi.fn(() => failureBuilder),
    };

    await expect(
      createChat(successSupabase as never, "user-1", {
        title: " Nuova chat ",
        turns: [{ role: "user", parts: [{ text: "ciao" }] }],
      }),
    ).resolves.toMatchObject({
      success: true,
      chat: { id: chatId },
    });
    await expect(
      createChat(failureSupabase as never, "user-1", {}),
    ).resolves.toEqual({
      success: false,
      error: "insert failed",
    });
  });

  it("gets chats by id, lists chats and deletes chats", async () => {
    vi.doMock("@/app/_features/assistant", () => ({
      SUMMARY_WINDOW_SIZE: 3,
      createSummaryTurn: vi.fn(),
    }));
    vi.doMock("@/app/_server/ai/llm", () => ({
      generateSummaryFromTurns: vi.fn(),
      generateChatSummaryForSearch: vi.fn(),
      generateChatTitle: vi.fn(),
    }));
    vi.doMock("@/app/_server/ai/embeddings", () => ({
      embed: vi.fn(),
    }));

    const getBuilder = createSelectBuilder({
      data: {
        id: chatId,
        user_id: "user-1",
        title: "Chat",
        full_history: [],
        assistant_history: [],
        summary_text: null,
        summary_embedding: null,
        last_activity_at: "2026-03-15T10:00:00.000Z",
        created_at: "2026-03-15T10:00:00.000Z",
      },
      error: null,
    }, "maybeSingle");
    const listBuilder = createSelectBuilder({
      data: [{ id: chatId }],
      error: null,
    }, "order");
    const deleteBuilder = createDeleteBuilder({
      error: null,
    });
    const missingBuilder = createSelectBuilder({
      data: null,
      error: null,
    }, "maybeSingle");

    const { deleteChat, getChatById, getChats } = await import("./chats.service");

    await expect(
      getChatById({ from: vi.fn(() => getBuilder) } as never, "user-1", chatId),
    ).resolves.toMatchObject({
      success: true,
      chat: { id: chatId },
    });
    await expect(
      getChats({ from: vi.fn(() => listBuilder) } as never, "user-1"),
    ).resolves.toMatchObject({
      success: true,
      chats: [{ id: chatId }],
    });
    await expect(
      deleteChat({ from: vi.fn(() => deleteBuilder) } as never, "user-1", chatId),
    ).resolves.toEqual({ success: true });
    await expect(
      getChatById({ from: vi.fn(() => missingBuilder) } as never, "user-1", chatId),
    ).resolves.toEqual({
      success: false,
      error: "Chat non trovata",
    });
  });

  it("handles semantic search validation, embedding failures and RPC mapping", async () => {
    const embedMock = vi.fn()
      .mockRejectedValueOnce(new Error("embedding failed"))
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.1, 0.2]);
    vi.doMock("@/app/_features/assistant", () => ({
      SUMMARY_WINDOW_SIZE: 3,
      createSummaryTurn: vi.fn(),
    }));
    vi.doMock("@/app/_server/ai/llm", () => ({
      generateSummaryFromTurns: vi.fn(),
      generateChatSummaryForSearch: vi.fn(),
      generateChatTitle: vi.fn(),
    }));
    vi.doMock("@/app/_server/ai/embeddings", () => ({
      embed: embedMock,
    }));

    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            chat_id: chatId,
            title: "Chat",
            summary_text: "Tema",
            similarity: 0.9,
            distance: 0.1,
            last_activity_at: "2026-03-15T10:00:00.000Z",
          },
          { chat_id: "", title: "skip", summary_text: "", similarity: 0, distance: 1, last_activity_at: "" },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "rpc failed" },
      });

    const { searchChatsSemantic } = await import("./chats.service");

    await expect(
      searchChatsSemantic({ rpc } as never, "user-1", " "),
    ).resolves.toEqual({
      success: false,
      error: "La query di ricerca non può essere vuota",
    });
    await expect(
      searchChatsSemantic({ rpc } as never, "user-1", "query"),
    ).resolves.toEqual({
      success: false,
      error: "Impossibile generare l'embedding. Verificare la configurazione (es. GEMINI_API_KEY).",
    });
    await expect(
      searchChatsSemantic({ rpc } as never, "user-1", "query"),
    ).resolves.toMatchObject({
      success: true,
      matches: [{ chat_id: chatId }],
    });
    await expect(
      searchChatsSemantic({ rpc } as never, "user-1", "query"),
    ).resolves.toEqual({
      success: false,
      error: "rpc failed",
    });
  });

  it("appends turns, compacts history, updates summaries and falls back on title generation failure", async () => {
    const createSummaryTurn = vi.fn((text: string) => ({
      role: "model",
      parts: [{ text: `summary:${text}` }],
    }));
    const generateSummaryFromTurns = vi.fn().mockResolvedValue("compact summary");
    const generateChatSummaryForSearch = vi.fn().mockResolvedValue("search summary");
    const generateChatTitle = vi.fn().mockRejectedValue(new Error("title failed"));
    const embedMock = vi.fn().mockResolvedValue([0.2, 0.4]);

    vi.doMock("@/app/_features/assistant", () => ({
      SUMMARY_WINDOW_SIZE: 3,
      createSummaryTurn,
    }));
    vi.doMock("@/app/_server/ai/llm", () => ({
      generateSummaryFromTurns,
      generateChatSummaryForSearch,
      generateChatTitle,
    }));
    vi.doMock("@/app/_server/ai/embeddings", () => ({
      embed: embedMock,
    }));

    const getBuilder = createSelectBuilder({
      data: {
        id: chatId,
        user_id: "user-1",
        title: null,
        full_history: [
          { role: "user", parts: [{ text: "uno" }] },
          { role: "model", parts: [{ text: "due" }] },
        ],
        assistant_history: [
          { role: "user", parts: [{ text: "uno" }] },
          { role: "model", parts: [{ text: "due" }] },
          { role: "user", parts: [{ text: "tre" }] },
        ],
        summary_text: null,
        summary_embedding: null,
        last_activity_at: "2026-03-15T10:00:00.000Z",
        created_at: "2026-03-15T10:00:00.000Z",
      },
      error: null,
    }, "maybeSingle");
    const updateBuilder = createUpdateBuilder({
      data: {
        id: chatId,
        user_id: "user-1",
        title: "Chat",
        full_history: [],
        assistant_history: [],
        summary_text: "search summary",
        summary_embedding: "[0.2,0.4]",
        last_activity_at: "2026-03-15T10:00:00.000Z",
        created_at: "2026-03-15T10:00:00.000Z",
      },
      error: null,
    });

    const supabase = {
      from: vi
        .fn()
        .mockImplementationOnce(() => getBuilder)
        .mockImplementationOnce(() => updateBuilder),
    };

    const { appendToChat } = await import("./chats.service");

    const response = await appendToChat(supabase as never, "user-1", {
      id: chatId,
      turns: [{ role: "model", parts: [{ text: "quattro" }] }],
    });

    expect(response).toMatchObject({
      success: true,
      chat: { id: chatId },
    });
    expect(createSummaryTurn).toHaveBeenCalledWith("compact summary");
    expect(generateChatSummaryForSearch).toHaveBeenCalled();
    expect(embedMock).toHaveBeenCalledWith("search summary", {
      taskType: "RETRIEVAL_DOCUMENT",
    });
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Chat",
        summary_text: "search summary",
        summary_embedding: JSON.stringify([0.2, 0.4]),
      }),
    );
  });
});
