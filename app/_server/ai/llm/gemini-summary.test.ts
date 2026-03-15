// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("gemini summary helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns an empty summary without calling Gemini for empty turns", async () => {
    const generateContent = vi.fn();
    class MockGoogleGenAI {
      readonly models = {
        generateContent,
      };
    }
    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));

    const { generateSummaryFromTurns } = await import("./gemini-summary");

    await expect(generateSummaryFromTurns([])).resolves.toBe("");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("requires a Gemini API key", async () => {
    const { generateChatTitle } = await import("./gemini-summary");

    await expect(generateChatTitle("")).rejects.toThrow(
      "GEMINI_API_KEY o NEXT_PUBLIC_GEMINI_API_KEY non configurata.",
    );
  });

  it("builds prompts from conversation turns and trims Gemini output", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "  Riassunto finale  ",
    });
    class MockGoogleGenAI {
      readonly models = {
        generateContent,
      };
    }
    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));
    vi.stubEnv("GEMINI_API_KEY", "server-key");

    const { generateSummaryFromTurns } = await import("./gemini-summary");

    await expect(
      generateSummaryFromTurns([
        { role: "user", parts: [{ text: "Ciao" }] },
        { role: "model", parts: [{ text: "Come posso aiutarti?" }] },
      ]),
    ).resolves.toBe("Riassunto finale");

    const request = generateContent.mock.calls[0]?.[0];
    expect(request.model).toBe("gemini-2.0-flash");
    expect(request.contents).toContain("Utente: Ciao");
    expect(request.contents).toContain("Modello: Come posso aiutarti?");
  });

  it("truncates the search summary prompt and the generated output", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "x".repeat(2505),
    });
    class MockGoogleGenAI {
      readonly models = {
        generateContent,
      };
    }
    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "public-key");

    const { generateChatSummaryForSearch } = await import("./gemini-summary");
    const longTurn = "a".repeat(13050);

    const summary = await generateChatSummaryForSearch([
      { role: "user", parts: [{ text: longTurn }] },
    ]);

    expect(summary).toHaveLength(2000);

    const request = generateContent.mock.calls[0]?.[0];
    expect(request.contents.endsWith("a".repeat(11992))).toBe(true);
    expect(request.contents.endsWith("a".repeat(13050))).toBe(false);
  });

  it("falls back to 'Chat' when Gemini returns an empty title", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "   ",
    });
    class MockGoogleGenAI {
      readonly models = {
        generateContent,
      };
    }
    vi.doMock("@google/genai", () => ({
      GoogleGenAI: MockGoogleGenAI,
    }));
    vi.stubEnv("GEMINI_API_KEY", "server-key");

    const { generateChatTitle } = await import("./gemini-summary");

    await expect(generateChatTitle("Conversazione di prova")).resolves.toBe("Chat");
  });
});
