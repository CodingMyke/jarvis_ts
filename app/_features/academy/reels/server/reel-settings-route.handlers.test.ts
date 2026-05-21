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
      settings: {
        reelScripting: { enabled: false, runTimes: [], scriptingContext: null },
        reelIdeaGeneration: {
          enabled: false,
          runTimes: [],
          ideasPerRun: 3,
          maxPendingAiIdeas: 10,
          latestPublishedReelsCount: 3,
          ideaGenerationContext: null,
        },
      },
    });
    serviceMocks.updateReelAutomationSettings.mockResolvedValue({
      success: true,
      settings: {
        reelScripting: { enabled: false, runTimes: [], scriptingContext: null },
        reelIdeaGeneration: {
          enabled: true,
          runTimes: ["08:00", "08:15"],
          ideasPerRun: 3,
          maxPendingAiIdeas: 10,
          latestPublishedReelsCount: 3,
          ideaGenerationContext: null,
        },
      },
    });

    const getResponse = await handleGetReelAutomationSettings(auth);
    const invalidPatch = await handlePatchReelAutomationSettings(auth, {
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["08:00", "08:05"],
      },
    });
    const okPatch = await handlePatchReelAutomationSettings(auth, {
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["08:00", "08:15"],
      },
    });

    await expect(getResponse.json()).resolves.toMatchObject({
      success: true,
      settings: { reelScripting: { enabled: false } },
    });
    expect(invalidPatch.status).toBe(400);
    await expect(invalidPatch.json()).resolves.toMatchObject({
      error: "INVALID_PAYLOAD",
      message: expect.stringContaining("10 minutes"),
    });
    await expect(okPatch.json()).resolves.toMatchObject({
      success: true,
      settings: { reelIdeaGeneration: { enabled: true } },
    });
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
