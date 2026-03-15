// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GeminiEmbeddingProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("reports whether the embedding API key is configured", async () => {
    const { GeminiEmbeddingProvider } = await import("./gemini-embedding.provider");

    expect(new GeminiEmbeddingProvider().isConfigured()).toBe(false);
  });

  it("returns early for empty batches and throws without an API key", async () => {
    const { GeminiEmbeddingProvider } = await import("./gemini-embedding.provider");
    const provider = new GeminiEmbeddingProvider();

    await expect(provider.embedBatch([])).resolves.toEqual([]);
    await expect(provider.embedBatch(["ciao"])).rejects.toThrow(
      "NEXT_PUBLIC_GEMINI_API_KEY non configurata per gli embedding.",
    );
  });

  it("maps Gemini embedContent responses into plain vectors", async () => {
    const embedContent = vi.fn().mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2] }, {}],
    });
    const googleGenAiCtor = vi.fn();
    class MockGoogleGenAI {
      readonly models = {
        embedContent,
      };

      constructor(options: { apiKey: string }) {
        googleGenAiCtor(options);
      }
    }

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "gemini-key");

    const { GeminiEmbeddingProvider } = await import("./gemini-embedding.provider");
    const provider = new GeminiEmbeddingProvider();

    await expect(
      provider.embedBatch(["alpha", "beta"], {
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1536,
      }),
    ).resolves.toEqual([[0.1, 0.2], []]);

    await expect(provider.embed("single")).resolves.toEqual([0.1, 0.2]);
    expect(googleGenAiCtor).toHaveBeenCalledOnce();
    expect(embedContent).toHaveBeenNthCalledWith(1, {
      model: "gemini-embedding-001",
      contents: ["alpha", "beta"],
      config: {
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 1536,
      },
    });
    expect(embedContent).toHaveBeenNthCalledWith(2, {
      model: "gemini-embedding-001",
      contents: ["single"],
      config: {
        outputDimensionality: 768,
      },
    });
  });
});

describe("embeddings.service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("delegates the public API to the default provider", async () => {
    const embedContent = vi
      .fn()
      .mockResolvedValueOnce({ embeddings: [{ values: [1, 2, 3] }] })
      .mockResolvedValueOnce({
        embeddings: [{ values: [4, 5] }, { values: [6, 7] }],
      });
    class MockGoogleGenAI {
      readonly models = {
        embedContent,
      };
    }
    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "gemini-key");

    const {
      EmbeddingsService,
      embed,
      embedBatch,
      getEmbeddingProvider,
      isEmbeddingConfigured,
    } = await import("./embeddings.service");

    expect(isEmbeddingConfigured()).toBe(true);
    await expect(embed("uno")).resolves.toEqual([1, 2, 3]);
    await expect(embedBatch(["due", "tre"])).resolves.toEqual([
      [4, 5],
      [6, 7],
    ]);

    const service = new EmbeddingsService();
    expect(service.providerName).toBe("gemini");
    expect(service.isConfigured()).toBe(true);
    expect(() => getEmbeddingProvider("invalid" as never)).toThrow(
      "Provider embedding sconosciuto: invalid",
    );
  });
});
