import { describe, expect, it, vi } from "vitest";
import {
  ensureUserSettings,
  getUserSettings,
  updateUserSettings,
} from "./user-settings-client";

describe("user settings client", () => {
  it("loads, ensures, and validates timezone updates", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            success: true,
            settings: { userId: "user-1", timezone: "Europe/Rome" },
          }),
          { status: 200 },
        );
      }

      if (init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            success: true,
            settings: { userId: "user-1", timezone: "America/New_York" },
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          settings: { userId: "user-1", timezone: "Europe/Rome" },
        }),
        { status: 200 },
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(getUserSettings()).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });

    await expect(ensureUserSettings("  Europe/Rome  ")).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: "Europe/Rome" }),
    });

    await expect(updateUserSettings({ timezone: "x".repeat(121) })).resolves.toMatchObject({
      success: false,
      status: 400,
    });

    await expect(updateUserSettings({ timezone: "  America/New_York  " })).resolves.toMatchObject({
      success: true,
      settings: { timezone: "America/New_York" },
    });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: "America/New_York" }),
    });
  });
});
