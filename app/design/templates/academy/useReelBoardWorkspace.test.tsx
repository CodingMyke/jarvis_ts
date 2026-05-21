// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReelBoard } from "@/app/_features/academy/reels";

const clientMocks = vi.hoisted(() => ({
  createReel: vi.fn(),
  deleteReel: vi.fn(),
  approveAiIdea: vi.fn(),
  getReelBoard: vi.fn(),
  updateReel: vi.fn(),
  updateReelStatus: vi.fn(),
  generateReelFields: vi.fn(),
  generateReelField: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/app/_features/academy/reels", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/academy/reels")>(
    "@/app/_features/academy/reels",
  );

  return {
    ...actual,
    createReel: clientMocks.createReel,
    deleteReel: clientMocks.deleteReel,
    approveAiIdea: clientMocks.approveAiIdea,
    getReelBoard: clientMocks.getReelBoard,
    updateReel: clientMocks.updateReel,
    updateReelStatus: clientMocks.updateReelStatus,
    generateReelFields: clientMocks.generateReelFields,
    generateReelField: clientMocks.generateReelField,
  };
});

import { useReelBoardWorkspace } from "./useReelBoardWorkspace";

const initialBoard: ReelBoard = {
  columns: {
    ai_idea: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "ai_idea",
        origin: "ai_idea_generation",
        idea: "AI idea",
        title: "AI idea",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
        last_idea_generation_run_id: "99999999-9999-4999-8999-999999999999",
        created_at: "2026-05-11T07:00:00.000Z",
        updated_at: "2026-05-11T07:00:00.000Z",
      },
    ],
    idea: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "idea",
        origin: "manual",
        idea: "Draft reel",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
        last_idea_generation_run_id: null,
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T08:00:00.000Z",
      },
    ],
    script: [],
    to_record: [],
    to_edit: [],
    ready: [],
    published: [],
  },
  count: 2,
};

describe("useReelBoardWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", clientMocks.fetch);
    clientMocks.getReelBoard.mockResolvedValue({
      success: true,
      board: initialBoard,
    });
  });

  it("moves a reel optimistically and rolls back when the api fails", async () => {
    clientMocks.updateReelStatus.mockResolvedValue({
      success: false,
      error: "UPDATE_FAILED",
      errorMessage: "Status failed",
    });

    const { result } = renderHook(() => useReelBoardWorkspace(initialBoard));

    await act(async () => {
      await result.current.moveReelToStatus("11111111-1111-4111-8111-111111111111", "ready");
    });

    expect(result.current.board.columns.idea).toHaveLength(1);
    expect(result.current.board.columns.ready).toHaveLength(0);
    expect(result.current.errorMessage).toBe("Status failed");
  });

  it("saves draft before queueing global generation", async () => {
    clientMocks.updateReel.mockResolvedValue({
      success: true,
      reel: {
        ...initialBoard.columns.idea[0],
        title: "Saved",
      },
    });
    clientMocks.generateReelFields.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useReelBoardWorkspace(initialBoard));

    await act(async () => {
      result.current.openEditReel(initialBoard.columns.idea[0]);
    });

    await act(async () => {
      await result.current.queueGlobalGeneration({ title: "Saved" });
    });

    expect(clientMocks.updateReel).toHaveBeenCalled();
    expect(clientMocks.generateReelFields).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("updates the board from manual idea generation results when returned", async () => {
    clientMocks.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        board: {
          columns: {
            ...initialBoard.columns,
            ai_idea: [
              initialBoard.columns.ai_idea[0],
              {
                id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                user_id: "22222222-2222-4222-8222-222222222222",
                status: "ai_idea",
                origin: "ai_idea_generation",
                idea: "Another AI idea",
                title: "Another AI idea",
                caption: null,
                body: null,
                hashtags: null,
                generation_status: "not_generated",
                notes: null,
                scheduled_at: null,
                published_at: null,
                last_idea_generation_run_id: "88888888-8888-4888-8888-888888888888",
                created_at: "2026-05-11T09:00:00.000Z",
                updated_at: "2026-05-11T09:00:00.000Z",
              },
            ],
          },
          count: 3,
        },
      }),
    });

    const { result } = renderHook(() => useReelBoardWorkspace(initialBoard));

    await act(async () => {
      await result.current.triggerManualIdeaGeneration();
    });

    expect(clientMocks.fetch).toHaveBeenCalledWith("/api/academy/reels/idea-generation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(result.current.board.columns.ai_idea).toHaveLength(2);
  });

  it("refreshes the board after manual idea generation when the api returns only run metadata", async () => {
    clientMocks.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        runId: "run-1",
        requestedCount: 3,
        createdCount: 2,
      }),
    });
    clientMocks.getReelBoard.mockResolvedValueOnce({
      success: true,
      board: {
        ...initialBoard,
        columns: {
          ...initialBoard.columns,
          ai_idea: [
            ...initialBoard.columns.ai_idea,
            {
              ...initialBoard.columns.ai_idea[0],
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              idea: "Another AI idea",
              title: "Another AI idea",
            },
          ],
        },
        count: 3,
      },
    });

    const { result } = renderHook(() => useReelBoardWorkspace(initialBoard));

    await act(async () => {
      await result.current.triggerManualIdeaGeneration();
    });

    expect(clientMocks.getReelBoard).toHaveBeenCalledTimes(1);
    expect(result.current.board.columns.ai_idea).toHaveLength(2);
  });

  it("approves an ai_idea through the dedicated server-backed action path", async () => {
    clientMocks.approveAiIdea.mockResolvedValue({
      success: true,
      reel: {
        ...initialBoard.columns.ai_idea[0],
        status: "idea",
        title: "Approved title",
        notes: "Saved first",
      },
    });

    const { result } = renderHook(() => useReelBoardWorkspace(initialBoard));

    await act(async () => {
      result.current.openEditReel(initialBoard.columns.ai_idea[0]);
    });

    await act(async () => {
      await result.current.approveAiIdea({
        title: "Approved title",
        notes: "Saved first",
      });
    });

    expect(clientMocks.approveAiIdea).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expect.objectContaining({
        idea: "AI idea",
        title: "Approved title",
        notes: "Saved first",
      }),
    );
    expect(clientMocks.updateReel).not.toHaveBeenCalled();
    expect(clientMocks.updateReelStatus).not.toHaveBeenCalled();
  });
});
