import { describe, expect, it, vi } from "vitest";
import { reelAutomationSettingsSchema } from "./reel-generation.schemas";
import { getReelAutomationSettings, updateReelAutomationSettings } from "./reel-settings-client";

describe("reel settings client", () => {
  it("parses nested automation settings with reel idea generation defaults", () => {
    const parsed = reelAutomationSettingsSchema.parse({
      reelScripting: {
        enabled: false,
        runTimes: ["09:00"],
        scriptingContext: null,
      },
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["10:00", "10:15"],
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
        ideaGenerationContext: null,
      },
    });

    expect(parsed.reelIdeaGeneration.latestPublishedReelsCount).toBe(3);
  });

  it("loads settings and validates update payload", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            success: true,
            settings: {
              reelScripting: {
                enabled: true,
                runTimes: ["08:00"],
                scriptingContext: null,
              },
              reelIdeaGeneration: {
                enabled: true,
                runTimes: ["10:00", "10:15"],
                ideasPerRun: 3,
                maxPendingAiIdeas: 10,
                latestPublishedReelsCount: 3,
                ideaGenerationContext: null,
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          settings: {
            reelScripting: {
              enabled: false,
              runTimes: [],
              scriptingContext: null,
            },
            reelIdeaGeneration: {
              enabled: false,
              runTimes: [],
              ideasPerRun: 3,
              maxPendingAiIdeas: 10,
              latestPublishedReelsCount: 3,
              ideaGenerationContext: null,
            },
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const getResult = await getReelAutomationSettings();
    expect(getResult).toMatchObject({
      success: true,
      settings: {
        reelScripting: { enabled: false },
        reelIdeaGeneration: { ideasPerRun: 3 },
      },
    });

    const invalid = await updateReelAutomationSettings({
      reelScripting: {
        enabled: false,
        runTimes: [],
        scriptingContext: null,
      },
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["10:00", "10:08"],
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
        ideaGenerationContext: null,
      },
    });
    expect(invalid).toMatchObject({ success: false, status: 400 });

    const ok = await updateReelAutomationSettings({
      reelScripting: {
        enabled: true,
        runTimes: ["08:00"],
        scriptingContext: null,
      },
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["10:00", "10:15"],
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
        ideaGenerationContext: null,
      },
    });
    expect(ok).toMatchObject({
      success: true,
      settings: {
        reelScripting: { enabled: true, runTimes: ["08:00"] },
        reelIdeaGeneration: { latestPublishedReelsCount: 3 },
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/academy/reels/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          reelScripting: {
            enabled: true,
            runTimes: ["08:00"],
            scriptingContext: null,
          },
          reelIdeaGeneration: {
            enabled: true,
            runTimes: ["10:00", "10:15"],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: null,
          },
        }),
      }),
    );
  });
});
