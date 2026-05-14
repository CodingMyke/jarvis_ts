import { describe, expect, it, vi } from "vitest";
import {
  ensureUserSettings,
  getUserSettings,
  updateUserSettings,
} from "./user-settings.service";

describe("user settings service", () => {
  it("loads, ensures, and updates the user timezone", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const insertSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", timezone: "Europe/Rome" },
      error: null,
    });
    const updateSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", timezone: "America/New_York" },
      error: null,
    });
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: insertSingle,
      })),
    }));
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: updateSingle,
        })),
      })),
    }));
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
      insert,
      update,
    }));
    const supabase = { from } as never;

    await expect(getUserSettings(supabase, "user-1")).resolves.toMatchObject({
      success: false,
      error: "NOT_FOUND",
    });

    await expect(ensureUserSettings(supabase, "user-1", "  Europe/Rome  ")).resolves.toMatchObject({
      success: true,
      settings: { userId: "user-1", timezone: "Europe/Rome" },
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      timezone: "Europe/Rome",
    });

    await expect(
      updateUserSettings(supabase, "user-1", { timezone: "  America/New_York  " }),
    ).resolves.toMatchObject({
      success: true,
      settings: { userId: "user-1", timezone: "America/New_York" },
    });
    expect(update).toHaveBeenCalledWith({
      timezone: "America/New_York",
    });
  });
});
