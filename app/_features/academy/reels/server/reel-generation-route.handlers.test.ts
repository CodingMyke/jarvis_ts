import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  generateReelFields: vi.fn(),
  generateReelField: vi.fn(),
}));

vi.mock("./reel-generation.service", () => serviceMocks);

import {
  handleGenerateReelFields,
  handleGenerateReelField,
} from "./reel-generation-route.handlers";

describe("reel generation route handlers", () => {
  const auth = { supabase: {} as never, userId: "user-1" };
  const reelId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates params and calls generation services", async () => {
    serviceMocks.generateReelFields.mockResolvedValue({ success: true });
    serviceMocks.generateReelField.mockResolvedValue({ success: true });

    const invalidReel = await handleGenerateReelFields(auth, "");
    const okGlobal = await handleGenerateReelFields(auth, reelId);
    const invalidField = await handleGenerateReelField(auth, reelId, "nope");
    const okField = await handleGenerateReelField(auth, reelId, "caption");

    expect(invalidReel.status).toBe(400);
    expect(invalidField.status).toBe(400);
    expect(serviceMocks.generateReelFields).toHaveBeenCalledWith(auth.supabase, auth.userId, reelId);
    expect(serviceMocks.generateReelField).toHaveBeenCalledWith(auth.supabase, auth.userId, reelId, "caption");

    await expect(okGlobal.json()).resolves.toMatchObject({ success: true });
    await expect(okField.json()).resolves.toMatchObject({ success: true });
  });

  it("maps service errors to responses", async () => {
    serviceMocks.generateReelFields.mockResolvedValue({
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    });

    const response = await handleGenerateReelFields(auth, reelId);
    expect(response.status).toBe(404);
  });
});

