import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReel,
  deleteReel,
  getReelBoard,
  updateReel,
  updateReelStatus,
} from "./reel-board-client";

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("reel board client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls board endpoints and normalizes api errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock
      .mockResolvedValueOnce(createJsonResponse({
        success: true,
        board: {
          columns: {
            idea: [],
            script: [],
            to_record: [],
            to_edit: [],
            ready: [],
            published: [],
          },
          count: 0,
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        success: true,
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          status: "idea",
          idea: "Idea",
          title: null,
          caption: null,
          body: null,
          hashtags: [],
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T08:00:00.000Z",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        success: true,
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          status: "idea",
          idea: "Idea",
          title: "Updated",
          caption: null,
          body: null,
          hashtags: [],
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T08:10:00.000Z",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        success: true,
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          status: "ready",
          idea: "Idea",
          title: "Updated",
          caption: null,
          body: null,
          hashtags: [],
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T08:20:00.000Z",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse(
        { success: false, error: "DELETE_FAILED", message: "boom" },
        { status: 500 },
      ));

    await expect(getReelBoard()).resolves.toMatchObject({ success: true, board: { count: 0 } });
    await createReel({ idea: "Idea" });
    await updateReel("reel-1", { title: "Updated" });
    await updateReelStatus("reel-1", { status: "ready" });
    await expect(deleteReel("reel-1")).resolves.toEqual({
      success: false,
      error: "DELETE_FAILED",
      errorMessage: "boom",
      status: 500,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/academy/reels");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/academy/reels",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/academy/reels/reel-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/academy/reels/reel-1/status",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/academy/reels/reel-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
