// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const embeddingMocks = vi.hoisted(() => ({
  embed: vi.fn(),
}));

vi.mock("@/app/_server/ai/embeddings", () => embeddingMocks);

import {
  createSemanticMemory,
  deleteSemanticMemory,
  getSemanticMemories,
  getSemanticMemoryById,
  searchSemanticMemoriesByContent,
  updateSemanticMemory,
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

describe("semantic memory functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates content, handles embedding failures and inserts new semantic memories", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.3, 0.4])
      .mockResolvedValueOnce([0.3, 0.4])
      .mockResolvedValueOnce([0.5, 0.6])
      .mockResolvedValueOnce([0.5, 0.6]);

    const insertBuilder = createInsertBuilder({
      data: { id: "sem-1", content: "Concetto" },
      error: null,
    });
    const insertErrorBuilder = createInsertBuilder({
      data: null,
      error: { message: "insert failed" },
    });

    const invalidResponse = await createSemanticMemory(
      { rpc: vi.fn(), from: vi.fn() } as never,
      "user-1",
      { content: " " },
    );
    const embeddingFailureResponse = await createSemanticMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(),
      } as never,
      "user-1",
      { content: "Concetto" },
    );
    const successResponse = await createSemanticMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(() => insertBuilder),
      } as never,
      "user-1",
      { content: "Concetto", key: "idea" },
    );
    const insertFailureResponse = await createSemanticMemory(
      {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
        from: vi.fn(() => insertErrorBuilder),
      } as never,
      "user-1",
      { content: "Concetto" },
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
      memory: { id: "sem-1" },
    });
    expect(insertFailureResponse).toEqual({
      success: false,
      error: "insert failed",
    });
  });

  it("deduplicates highly similar semantic memories through update", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.2, 0.3]);

    const updateBuilder = createUpdateBuilder({
      data: {
        id: "sem-1",
        content: "Vecchio\n\nNuovo",
      },
      error: null,
    });

    const result = await createSemanticMemory(
      {
        rpc: vi.fn().mockResolvedValue({
          data: [
            {
              id: "sem-1",
              content: "Vecchio",
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
        key: "idea",
      },
    );

    expect(result).toMatchObject({
      success: true,
      memory: { id: "sem-1" },
    });
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Vecchio\n\nNuovo",
        key: "idea",
      }),
    );
  });

  it("lists semantic memories, reads by id and surfaces lookup failures", async () => {
    const listBuilder = createSelectBuilder({
      data: [{ id: "sem-1" }],
      error: null,
    }, "order");
    const itemBuilder = createSelectBuilder({
      data: { id: "sem-2" },
      error: null,
    }, "maybeSingle");
    const missingBuilder = createSelectBuilder({
      data: null,
      error: null,
    }, "maybeSingle");

    await expect(
      getSemanticMemories({ from: vi.fn(() => listBuilder) } as never, "user-1"),
    ).resolves.toMatchObject({
      success: true,
      memories: [{ id: "sem-1" }],
    });
    await expect(
      getSemanticMemoryById({ from: vi.fn(() => itemBuilder) } as never, "user-1", "sem-2"),
    ).resolves.toMatchObject({
      success: true,
      memory: { id: "sem-2" },
    });
    await expect(
      getSemanticMemoryById({ from: vi.fn(() => missingBuilder) } as never, "user-1", "sem-3"),
    ).resolves.toEqual({
      success: false,
      error: "Record non trovato",
    });
  });

  it("updates semantic memories and validates update edge cases", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.2, 0.4]);

    const notFoundBuilder = createUpdateBuilder({
      data: null,
      error: null,
    });
    const successBuilder = createUpdateBuilder({
      data: { id: "sem-1", content: "Nuovo" },
      error: null,
    });

    const emptyContentResponse = await updateSemanticMemory(
      { from: vi.fn() } as never,
      "user-1",
      "sem-1",
      { content: " " },
    );
    const embeddingFailureResponse = await updateSemanticMemory(
      { from: vi.fn() } as never,
      "user-1",
      "sem-1",
      { content: "Nuovo" },
    );
    const notFoundResponse = await updateSemanticMemory(
      { from: vi.fn(() => notFoundBuilder) } as never,
      "user-1",
      "sem-1",
      { key: "idea" },
    );
    const successResponse = await updateSemanticMemory(
      { from: vi.fn(() => successBuilder) } as never,
      "user-1",
      "sem-1",
      { content: "Nuovo", key: "idea" },
    );

    expect(emptyContentResponse).toEqual({
      success: false,
      error: "Il contenuto non può essere vuoto",
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
      memory: { id: "sem-1" },
    });
  });

  it("deletes semantic memories and searches by semantic similarity", async () => {
    embeddingMocks.embed
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([0.3, 0.5])
      .mockResolvedValueOnce([0.3, 0.5]);

    const deleteSuccessBuilder = createDeleteBuilder({
      error: null,
    });
    const deleteErrorBuilder = createDeleteBuilder({
      error: { message: "delete failed" },
    });

    await expect(
      deleteSemanticMemory({ from: vi.fn(() => deleteSuccessBuilder) } as never, "user-1", "sem-1"),
    ).resolves.toEqual({ success: true });
    await expect(
      deleteSemanticMemory({ from: vi.fn(() => deleteErrorBuilder) } as never, "user-1", "sem-1"),
    ).resolves.toEqual({
      success: false,
      error: "delete failed",
    });
    await expect(
      searchSemanticMemoriesByContent({ rpc: vi.fn() } as never, "user-1", " "),
    ).resolves.toEqual({
      success: false,
      error: "La query di ricerca non può essere vuota",
    });
    await expect(
      searchSemanticMemoriesByContent({ rpc: vi.fn() } as never, "user-1", "query"),
    ).resolves.toEqual({
      success: false,
      error: "Impossibile generare l'embedding. Verificare la configurazione del servizio (es. GEMINI_API_KEY).",
    });
    await expect(
      searchSemanticMemoriesByContent(
        {
          rpc: vi.fn().mockResolvedValue({
            data: [
              {
                id: "sem-1",
                content: "Concetto",
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
      memories: [{ id: "sem-1", similarity: 0.91 }],
    });
    await expect(
      searchSemanticMemoriesByContent(
        {
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "rpc failed" },
          }),
        } as never,
        "user-1",
        "query",
        3,
      ),
    ).resolves.toEqual({
      success: false,
      error: "rpc failed",
    });
  });
});
