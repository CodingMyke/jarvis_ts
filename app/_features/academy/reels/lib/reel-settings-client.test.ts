import { describe, expect, it, vi } from "vitest";
import { getReelAutomationSettings, updateReelAutomationSettings } from "./reel-settings-client";

describe("reel settings client", () => {
  it("loads settings and validates update payload", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return new Response(JSON.stringify({ success: true, settings: { enabled: true, runTimes: ["08:00"], editorialContext: null } }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, settings: { enabled: false, runTimes: [], editorialContext: null } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const getResult = await getReelAutomationSettings();
    expect(getResult).toMatchObject({ success: true, settings: { enabled: false } });

    const invalid = await updateReelAutomationSettings({ enabled: true, runTimes: [] });
    expect(invalid).toMatchObject({ success: false, status: 400 });

    const ok = await updateReelAutomationSettings({ enabled: true, runTimes: ["08:00"] });
    expect(ok).toMatchObject({ success: true, settings: { enabled: true, runTimes: ["08:00"] } });
  });
});

