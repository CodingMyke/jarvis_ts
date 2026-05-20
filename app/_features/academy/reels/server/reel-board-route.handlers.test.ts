import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getReelBoard: vi.fn(),
  createReel: vi.fn(),
  updateReel: vi.fn(),
  updateReelStatus: vi.fn(),
  approveAiIdea: vi.fn(),
  deleteReel: vi.fn(),
}));

vi.mock("./reel-board.service", () => serviceMocks);

import {
  getReelBoardUnauthorizedResponse,
  handleCreateReel,
  handleDeleteReel,
  handleGetReelBoard,
  handleApproveAiIdea,
  handleUpdateReel,
  handleUpdateReelStatus,
} from "./reel-board-route.handlers";

describe("reel board route handlers", () => {
  const auth = { supabase: {} as never, userId: "user-1" };
  const reelId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized response", async () => {
    const response = getReelBoardUnauthorizedResponse();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("returns grouped board data for GET", async () => {
    serviceMocks.getReelBoard.mockResolvedValue({
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
    });

    const response = await handleGetReelBoard(auth);
    expect(serviceMocks.getReelBoard).toHaveBeenCalledWith(auth.supabase, auth.userId);
    await expect(response.json()).resolves.toMatchObject({ success: true, board: { count: 0 } });
  });

  it("validates creation, edit, status update and delete flows", async () => {
    serviceMocks.createReel.mockResolvedValue({
      success: true,
      reel: { id: reelId, status: "idea", idea: "Idea" },
    });
    serviceMocks.updateReel.mockResolvedValue({
      success: true,
      reel: { id: reelId, status: "script", idea: "Idea", title: "Updated" },
    });
    serviceMocks.updateReelStatus.mockResolvedValue({
      success: true,
      reel: { id: reelId, status: "ready", idea: "Idea" },
    });
    serviceMocks.approveAiIdea.mockResolvedValue({
      success: true,
      reel: { id: reelId, status: "idea", idea: "Approved idea", title: "Updated" },
    });
    serviceMocks.deleteReel.mockResolvedValue({
      success: true,
      reelId,
    });

    const invalidCreate = await handleCreateReel(auth, {});
    const createResponse = await handleCreateReel(auth, { idea: "Idea" });
    const invalidUpdate = await handleUpdateReel(auth, "", { title: "Updated" });
    const updateResponse = await handleUpdateReel(auth, reelId, { title: "Updated" });
    const invalidStatus = await handleUpdateReelStatus(auth, reelId, { status: "wrong" });
    const statusResponse = await handleUpdateReelStatus(auth, reelId, { status: "ready" });
    const invalidApprove = await handleApproveAiIdea(auth, reelId, {});
    const approveResponse = await handleApproveAiIdea(auth, reelId, { idea: "Approved idea" });
    const deleteResponse = await handleDeleteReel(auth, reelId);

    expect(invalidCreate.status).toBe(400);
    expect(invalidUpdate.status).toBe(400);
    expect(invalidStatus.status).toBe(400);
    expect(invalidApprove.status).toBe(400);
    await expect(createResponse.json()).resolves.toMatchObject({ success: true, reel: { id: reelId } });
    await expect(updateResponse.json()).resolves.toMatchObject({ success: true, reel: { title: "Updated" } });
    await expect(statusResponse.json()).resolves.toMatchObject({ success: true, reel: { status: "ready" } });
    await expect(approveResponse.json()).resolves.toMatchObject({ success: true, reel: { idea: "Approved idea" } });
    await expect(deleteResponse.json()).resolves.toMatchObject({ success: true, reelId });
  });

  it("maps service errors to route responses", async () => {
    serviceMocks.updateReel.mockResolvedValue({
      success: false,
      error: "IMMUTABLE_FIELD",
      message: "origin cannot be changed",
    });
    serviceMocks.updateReelStatus.mockResolvedValue({
      success: false,
      error: "INVALID_STATUS_TRANSITION",
      message: "Only Reel Idea Generation may place reels in ai_idea",
    });
    serviceMocks.approveAiIdea.mockResolvedValue({
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    });
    serviceMocks.deleteReel.mockResolvedValueOnce({
      success: false,
      error: "NOT_FOUND",
      message: "Reel not found",
    });
    serviceMocks.deleteReel.mockResolvedValueOnce({
      success: false,
      error: "DELETE_FAILED",
      message: "boom",
    });

    const updateResponse = await handleUpdateReel(auth, reelId, { title: "Updated" });
    const invalidTransitionResponse = await handleUpdateReelStatus(auth, reelId, { status: "ai_idea" });
    const approveResponse = await handleApproveAiIdea(auth, reelId, { idea: "Approved idea" });
    const notFoundDeleteResponse = await handleDeleteReel(auth, reelId);
    const deleteResponse = await handleDeleteReel(auth, reelId);

    expect(updateResponse.status).toBe(500);
    expect(invalidTransitionResponse.status).toBe(400);
    expect(approveResponse.status).toBe(404);
    expect(notFoundDeleteResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(500);
  });
});
