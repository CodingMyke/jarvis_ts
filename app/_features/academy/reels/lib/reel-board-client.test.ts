import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveAiIdea,
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
            ai_idea: [],
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
          origin: "manual",
          last_idea_generation_run_id: null,
          generation_status: "not_generated",
          idea: "Idea",
          title: null,
          caption: null,
          body: null,
          hashtags: null,
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
          status: "ai_idea",
          origin: "ai_idea_generation",
          last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333",
          generation_status: "completed",
          idea: "Idea",
          title: "Updated",
          caption: null,
          body: null,
          hashtags: null,
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
          origin: "ai_idea_generation",
          last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333",
          generation_status: "completed",
          idea: "Idea",
          title: "Updated",
          caption: null,
          body: null,
          hashtags: null,
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T08:20:00.000Z",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        success: true,
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          status: "idea",
          origin: "ai_idea_generation",
          last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333",
          generation_status: "completed",
          idea: "Approved idea",
          title: "Updated",
          caption: "Caption",
          body: "Body",
          hashtags: "#tags",
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T08:21:00.000Z",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse(
        { success: false, error: "DELETE_FAILED", message: "boom" },
        { status: 500 },
      ));

    await expect(getReelBoard()).resolves.toMatchObject({
      success: true,
      board: { columns: { ai_idea: [] }, count: 0 },
    });
    await expect(createReel({ idea: "Idea" })).resolves.toMatchObject({
      success: true,
      reel: { status: "idea", origin: "manual" },
    });
    await expect(updateReel("reel-1", { title: "Updated" })).resolves.toMatchObject({
      success: true,
      reel: { last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333" },
    });
    await updateReelStatus("reel-1", { status: "ready" });
    await expect(approveAiIdea("reel-1", { idea: "Approved idea", caption: "Caption", body: "Body", hashtags: "#tags" }))
      .resolves.toMatchObject({
        success: true,
        reel: { status: "idea", idea: "Approved idea" },
      });
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
      "/api/academy/reels/reel-1/approve",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/academy/reels/reel-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("does not report HTTP 200 when a successful status code returns an invalid payload", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateReelStatus("reel-1", { status: "ready" })).resolves.toEqual({
      success: false,
      error: "UPDATE_FAILED",
      errorMessage: "Reel response is invalid.",
      status: 200,
    });
  });

  it("normalizes a minimal create response payload", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      createJsonResponse({
        success: true,
        reel: {
          id: "11111111-1111-4111-8111-111111111111",
          status: "idea",
          idea: "Idea",
          generation_status: "not_generated",
          title: null,
          caption: null,
          body: null,
          hashtags: null,
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-20T19:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createReel({ idea: "Idea" })).resolves.toMatchObject({
      success: true,
      reel: {
        id: "11111111-1111-4111-8111-111111111111",
        status: "idea",
        idea: "Idea",
        origin: "manual",
        last_idea_generation_run_id: null,
        updated_at: "2026-05-20T19:00:00.000Z",
      },
    });
  });
});
