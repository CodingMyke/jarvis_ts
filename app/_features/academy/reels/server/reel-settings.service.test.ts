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
    expect(reelAutomationSettingsSchema.safeParse({ enabled: true, runTimes: [] }).success).toBe(false);

    const parsed = reelAutomationSettingsSchema.parse({
      enabled: true,
      runTimes: ["09:00", "09:00", "08:00"],
      editorialContext: "  context ",
    });

    expect(parsed).toEqual({
      enabled: true,
      runTimes: ["08:00", "09:00"],
      editorialContext: "context",
    });
  });

  it("loads and updates user settings through the repository", async () => {
    repositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: { user_id: userId, config: { enabled: false, runTimes: [], editorialContext: null } },
      error: null,
    });

    const getResult = await getReelAutomationSettings(supabase, userId);
    expect(getResult).toMatchObject({ success: true, settings: { enabled: false } });

    repositoryMocks.upsertGenerationSettings.mockResolvedValue({
      data: { user_id: userId, config: { enabled: true, runTimes: ["08:00"] } },
      error: null,
    });

    const updateResult = await updateReelAutomationSettings(supabase, userId, {
      enabled: true,
      runTimes: ["08:00"],
      editorialContext: null,
    });

    expect(repositoryMocks.upsertGenerationSettings).toHaveBeenCalledWith(
      supabase,
      userId,
      expect.objectContaining({ enabled: true, runTimes: ["08:00"], editorialContext: null }),
    );
    expect(updateResult).toMatchObject({ success: true, settings: { enabled: true, runTimes: ["08:00"] } });
  });
});

