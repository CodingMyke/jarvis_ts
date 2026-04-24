// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const embeddingMocks = vi.hoisted(() => ({
  embed: vi.fn(),
}));

vi.mock("@/app/_server/ai/embeddings", () => embeddingMocks);

import {
  createEpisodicMemory,
  deleteEpisodicMemory,
  getEpisodicMemories,
  getEpisodicMemoryById,
  searchEpisodicMemoriesByContent,
  updateEpisodicMemory,
} from "./functions";

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
  if (mode === "maybeSingle") {
    builder.maybeSingle.mockResolvedValue(result);
  } else {
    builder.order.mockResolvedValue(result);
  }
  return builder;
}

function createInsertBuilder(result: unknown): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as QueryBuilder;
  builder.insert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return builder;
}

function createUpdateBuilder(result: unknown): QueryBuilder {
  const builder = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
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
  Object.assign(builder as object, result);
  builder.delete.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

describe("episodic memory functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates content, handles embedding failures and inserts new memories", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.3, 0.4])
      .mockResolvedValueOnce([0.3, 0.4])
      .mockResolvedValueOnce([0.5, 0.6])
      .mockResolvedValueOnce([0.5, 0.6]);

    const insertBuilder = createInsertBuilder({
      data: { id: "mem-1", content: "Ricordo" },
      error: null,
    });
    const insertErrorBuilder = createInsertBuilder({
      data: null,
      error: { message: "insert failed" },
    });

    const invalidResponse = await createEpisodicMemory(
      { rpc: vi.fn(), from: vi.fn() } as never,
      "user-1",
      { content: " " },
    );
    const embeddingFailureResponse = await createEpisodicMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(),
      } as never,
      "user-1",
      { content: "Ricordo" },
    );
    const successResponse = await createEpisodicMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(() => insertBuilder),
      } as never,
      "user-1",
      { content: "Ricordo", metadata: { source: "test" } },
    );
    const insertFailureResponse = await createEpisodicMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(() => insertErrorBuilder),
      } as never,
      "user-1",
      { content: "Ricordo" },
    );

    expect(invalidResponse).toEqual({
      success: false,
      error: "Il contenuto non può essere vuoto",
    });
    expect(embeddingFailureResponse).toEqual({
      success: false,
      error: "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).",
    });
    expect(successResponse).toMatchObject({
      success: true,
      memory: { id: "mem-1" },
    });
    expect(insertFailureResponse).toEqual({
      success: false,
      error: "insert failed",
    });
  });

  it("deduplicates highly similar episodic memories through update", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.2, 0.3]);

    const updateBuilder = createUpdateBuilder({
      data: {
        id: "mem-1",
        content: "Vecchio\n\nNuovo",
      },
      error: null,
    });

    const result = await createEpisodicMemory(
      {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: "mem-1",
              content: "Vecchio",
              importance: "medium",
              created_at: "2026-03-15T10:00:00.000Z",
              similarity: 0.9,
            },
          ],
          error: null,
        }),
        from: vi.fn(() => updateBuilder),
      } as never,
      "user-1",
      {
        content: "Nuovo",
        importance: "high",
      },
    );

    expect(result).toMatchObject({
      success: true,
      memory: { id: "mem-1" },
    });
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Vecchio\n\nNuovo",
      }),
    );
  });

  it("lists memories, reads by id and surfaces lookup failures", async () => {
    const listBuilder = createSelectBuilder({
      data: [{ id: "mem-1" }],
      error: null,
    }, "order");
    const itemBuilder = createSelectBuilder({
      data: { id: "mem-2" },
      error: null,
    }, "maybeSingle");
    const missingBuilder = createSelectBuilder({
      data: null,
      error: null,
    }, "maybeSingle");

    await expect(
      getEpisodicMemories({ from: vi.fn(() => listBuilder) } as never, "user-1"),
    ).resolves.toMatchObject({
      success: true,
      memories: [{ id: "mem-1" }],
    });
    await expect(
      getEpisodicMemoryById({ from: vi.fn(() => itemBuilder) } as never, "user-1", "mem-2"),
    ).resolves.toMatchObject({
      success: true,
      memory: { id: "mem-2" },
    });
    await expect(
      getEpisodicMemoryById({ from: vi.fn(() => missingBuilder) } as never, "user-1", "mem-3"),
    ).resolves.toEqual({
      success: false,
      error: "Record non trovato",
    });
  });

  it("updates memories and validates update edge cases", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.2, 0.4]);

    const notFoundBuilder = createUpdateBuilder({
      data: null,
      error: null,
    });
    const successBuilder = createUpdateBuilder({
      data: { id: "mem-1", content: "Nuovo" },
      error: null,
    });

    const emptyContentResponse = await updateEpisodicMemory(
      { from: vi.fn() } as never,
      "user-1",
      "mem-1",
      { content: " " },
    );
    const noFieldsResponse = await updateEpisodicMemory(
      { from: vi.fn() } as never,
      "user-1",
      "mem-1",
      {},
    );
    const embeddingFailureResponse = await updateEpisodicMemory(
      { from: vi.fn() } as never,
      "user-1",
      "mem-1",
      { content: "Nuovo" },
    );
    const notFoundResponse = await updateEpisodicMemory(
      { from: vi.fn(() => notFoundBuilder) } as never,
      "user-1",
      "mem-1",
      { metadata: { source: "x" } },
    );
    const successResponse = await updateEpisodicMemory(
      { from: vi.fn(() => successBuilder) } as never,
      "user-1",
      "mem-1",
      { content: "Nuovo", ttl_days: 7 },
    );

    expect(emptyContentResponse).toEqual({
      success: false,
      error: "Il contenuto non può essere vuoto",
    });
    expect(noFieldsResponse).toEqual({
      success: false,
      error: "Nessun campo da aggiornare",
    });
    expect(embeddingFailureResponse).toEqual({
      success: false,
      error: "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).",
    });
    expect(notFoundResponse).toEqual({
      success: false,
      error: "Record non trovato",
    });
    expect(successResponse).toMatchObject({
      success: true,
      memory: { id: "mem-1" },
    });
  });

  it("deletes episodic memories and searches by semantic similarity", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.3, 0.5]);

    const deleteSuccessBuilder = createDeleteBuilder({
      error: null,
    });
    const deleteErrorBuilder = createDeleteBuilder({
      error: { message: "delete failed" },
    });

    await expect(
      deleteEpisodicMemory({ from: vi.fn(() => deleteSuccessBuilder) } as never, "user-1", "mem-1"),
    ).resolves.toEqual({ success: true });
    await expect(
      deleteEpisodicMemory({ from: vi.fn(() => deleteErrorBuilder) } as never, "user-1", "mem-1"),
    ).resolves.toEqual({
      success: false,
      error: "delete failed",
    });
    await expect(
      searchEpisodicMemoriesByContent({ rpc: vi.fn() } as never, "user-1", " "),
    ).resolves.toEqual({
      success: false,
      error: "La query di ricerca non può essere vuota",
    });
    await expect(
      searchEpisodicMemoriesByContent({ rpc: vi.fn() } as never, "user-1", "query"),
    ).resolves.toEqual({
      success: false,
      error: "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).",
    });
    await expect(
      searchEpisodicMemoriesByContent(
        {
          rpc: vi.fn().mockResolvedValue({
            data: [
              {
                id: "mem-1",
                content: "Ricordo",
                importance: "high",
                created_at: "2026-03-15T10:00:00.000Z",
                similarity: 0.91,
              },
            ],
            error: null,
          }),
        } as never,
        "user-1",
        "query",
        3,
      ),
    ).resolves.toMatchObject({
      success: true,
      memories: [{ id: "mem-1", similarity: 0.91 }],
    });
  });
});
