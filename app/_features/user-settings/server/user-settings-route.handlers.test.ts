import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getUserSettings: vi.fn(),
  ensureUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

vi.mock("./user-settings.service", () => serviceMocks);

import {
  handleEnsureUserSettings,
  handleGetUserSettings,
  handlePatchUserSettings,
} from "./user-settings-route.handlers";

describe("user settings route handlers", () => {
  const auth = { supabase: {} as never, userId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings for GET, POST, and validates PATCH payload", async () => {
    serviceMocks.getUserSettings.mockResolvedValue({
      success: true,
      settings: { userId: "user-1", timezone: "Europe/Rome" },
    });
    serviceMocks.ensureUserSettings.mockResolvedValue({
      success: true,
      settings: { userId: "user-1", timezone: "Europe/Rome" },
    });
    serviceMocks.updateUserSettings.mockResolvedValue({
      success: true,
      settings: { userId: "user-1", timezone: "America/New_York" },
    });

    const getResponse = await handleGetUserSettings(auth);
    const postResponse = await handleEnsureUserSettings(auth, { timezone: "Europe/Rome" });
    const invalidPatch = await handlePatchUserSettings(auth, { timezone: " " });
    const okPatch = await handlePatchUserSettings(auth, { timezone: "  America/New_York  " });

    await expect(getResponse.json()).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });
    await expect(postResponse.json()).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });
    expect(invalidPatch.status).toBe(400);
    await expect(okPatch.json()).resolves.toMatchObject({
      success: true,
      settings: { timezone: "America/New_York" },
    });
    expect(serviceMocks.ensureUserSettings).toHaveBeenCalledWith(
      auth.supabase,
      auth.userId,
      "Europe/Rome",
    );
    expect(serviceMocks.updateUserSettings).toHaveBeenCalledWith(
      auth.supabase,
      auth.userId,
      { timezone: "America/New_York" },
    );
  });

  it("maps missing settings to 404", async () => {
    serviceMocks.getUserSettings.mockResolvedValue({
      success: false,
      error: "NOT_FOUND",
      message: "User settings not found.",
    });

    const response = await handleGetUserSettings(auth);

    expect(response.status).toBe(404);
  });
});
