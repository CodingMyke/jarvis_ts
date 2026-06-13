import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getReelAutomationSettings: vi.fn(),
  updateReelAutomationSettings: vi.fn(),
}));

vi.mock("./reel-settings.service", () => serviceMocks);

import { handleGetReelAutomationSettings, handlePatchReelAutomationSettings } from "./reel-settings-route.handlers";

describe("reel settings route handlers", () => {
  const auth = { supabase: {} as never, userId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings for GET and validates PATCH payload", async () => {
    serviceMocks.getReelAutomationSettings.mockResolvedValue({
      success: true,
      settings: { enabled: false, runTimes: [], editorialContext: null },
    });
    serviceMocks.updateReelAutomationSettings.mockResolvedValue({
      success: true,
      settings: { enabled: true, runTimes: ["08:00"], editorialContext: null },
    });

    const getResponse = await handleGetReelAutomationSettings(auth);
    const invalidPatch = await handlePatchReelAutomationSettings(auth, { enabled: true, runTimes: [] });
    const okPatch = await handlePatchReelAutomationSettings(auth, { enabled: true, runTimes: ["08:00"] });

    await expect(getResponse.json()).resolves.toMatchObject({ success: true, settings: { enabled: false } });
    expect(invalidPatch.status).toBe(400);
    await expect(okPatch.json()).resolves.toMatchObject({ success: true, settings: { enabled: true } });
  });

  it("maps service errors to response", async () => {
    serviceMocks.getReelAutomationSettings.mockResolvedValue({
      success: false,
      error: "LOAD_FAILED",
      message: "boom",
    });

    const response = await handleGetReelAutomationSettings(auth);
    expect(response.status).toBe(500);
  });
});

