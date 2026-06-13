// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReelBoard } from "@/app/_features/academy/reels";

const clientMocks = vi.hoisted(() => ({
  createReel: vi.fn(),
  deleteReel: vi.fn(),
  updateReel: vi.fn(),
  updateReelStatus: vi.fn(),
  generateReelFields: vi.fn(),
  generateReelField: vi.fn(),
}));

vi.mock("@/app/_features/academy/reels", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/academy/reels")>(
    "@/app/_features/academy/reels",
  );

  return {
    ...actual,
    createReel: clientMocks.createReel,
    deleteReel: clientMocks.deleteReel,
    updateReel: clientMocks.updateReel,
    updateReelStatus: clientMocks.updateReelStatus,
    generateReelFields: clientMocks.generateReelFields,
    generateReelField: clientMocks.generateReelField,
  };
});

import { useReelBoardWorkspace } from "./useReelBoardWorkspace";

const initialBoard: ReelBoard = {
  columns: {
    idea: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "idea",
        idea: "Draft reel",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
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
  count: 1,
};

describe("useReelBoardWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
