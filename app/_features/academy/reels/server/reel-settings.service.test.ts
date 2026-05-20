import { describe, expect, it, vi } from "vitest";

const repositoryMocks = vi.hoisted(() => ({
  getGenerationSettingsByUser: vi.fn(),
  upsertGenerationSettings: vi.fn(),
}));

vi.mock("./reel-generation.repository", () => repositoryMocks);

import { reelAutomationSettingsSchema } from "../lib/reel-generation.schemas";
import {
  getReelAutomationSettings,
  updateReelAutomationSettings,
} from "./reel-settings.service";

describe("reel settings service", () => {
  const supabase = {} as never;
  const userId = "11111111-1111-4111-8111-111111111111";

  it("validates settings payload and normalizes run times", () => {
    expect(
      reelAutomationSettingsSchema.safeParse({
        reelScripting: { enabled: true, runTimes: [], scriptingContext: null },
      }).success,
    ).toBe(false);

    const parsed = reelAutomationSettingsSchema.parse({
      reelScripting: {
        enabled: true,
        runTimes: ["09:00", "09:00", "08:00"],
        scriptingContext: "  context ",
      },
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["10:00", "10:15", "10:15"],
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
        ideaGenerationContext: "  idea context ",
      },
    });

    expect(parsed).toEqual({
      reelScripting: {
        enabled: true,
        runTimes: ["08:00", "09:00"],
        scriptingContext: "context",
      },
      reelIdeaGeneration: {
        enabled: true,
        runTimes: ["10:00", "10:15"],
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
        ideaGenerationContext: "idea context",
      },
    });
  });

  it("loads and updates user settings through the repository", async () => {
    repositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
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
      },
      error: null,
    });

    const getResult = await getReelAutomationSettings(supabase, userId);
    expect(getResult).toMatchObject({
      success: true,
      settings: { reelScripting: { enabled: false } },
    });

    repositoryMocks.upsertGenerationSettings.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          reelScripting: { enabled: true, runTimes: ["08:00"], scriptingContext: null },
          reelIdeaGeneration: {
            enabled: false,
            runTimes: [],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: null,
          },
        },
      },
      error: null,
    });

    const updateResult = await updateReelAutomationSettings(supabase, userId, {
      reelScripting: {
        enabled: true,
        runTimes: ["08:00"],
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
    });

    expect(repositoryMocks.upsertGenerationSettings).toHaveBeenCalledWith(
      supabase,
      userId,
      expect.objectContaining({
        reelScripting: { enabled: true, runTimes: ["08:00"], scriptingContext: null },
      }),
    );
    expect(updateResult).toMatchObject({
      success: true,
      settings: {
        reelScripting: { enabled: true, runTimes: ["08:00"] },
      },
    });
  });

  it("returns nested default settings for users with no row", async () => {
    repositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getReelAutomationSettings(supabase, userId);

    expect(result).toEqual({
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
    });
  });

  it("normalizes legacy flat settings rows into the nested shape", async () => {
    repositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          enabled: true,
          runTimes: ["08:00"],
          editorialContext: "legacy",
        },
      },
      error: null,
    });

    const result = await getReelAutomationSettings(supabase, userId);

    expect(result).toEqual({
      success: true,
      settings: {
        reelScripting: {
          enabled: true,
          runTimes: ["08:00"],
          scriptingContext: "legacy",
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
    });
  });
});
