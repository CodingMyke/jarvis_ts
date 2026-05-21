import { describe, expect, it, vi } from "vitest";
import { generateReelField, generateReelFields } from "./reel-generation-client";

describe("reel generation client", () => {
  it("validates input and maps HTTP errors", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const invalid = await generateReelFields("");
    expect(invalid).toMatchObject({ success: false, status: 400 });

    const reelId = "11111111-1111-4111-8111-111111111111";
    const ok = await generateReelField(reelId, "caption");
    expect(ok).toMatchObject({ success: true });
  });

  it("does not report HTTP 200 when a successful status code returns an invalid payload", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const reelId = "11111111-1111-4111-8111-111111111111";
    await expect(generateReelField(reelId, "caption")).resolves.toEqual({
      success: false,
      error: "GENERATION_FAILED",
      errorMessage: "Reel generation response is invalid.",
      status: 200,
    });
  });
});
