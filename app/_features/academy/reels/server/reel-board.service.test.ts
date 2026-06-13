import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REEL_BOARD_STATUSES } from "../lib/reel-board.constants";
import {
  createReelSchema,
  generationStatusSchema,
  reelStatusSchema,
  updateReelSchema,
} from "../lib/reel-board.schemas";
import { REEL_GENERATION_STATUSES } from "../lib/reel-board.constants";

const repositoryMocks = vi.hoisted(() => ({
  listReelsByUser: vi.fn(),
  insertReel: vi.fn(),
  updateReelById: vi.fn(),
  deleteReelById: vi.fn(),
}));

vi.mock("./reel-board.repository", () => repositoryMocks);

describe("reel board service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes reel generation fields in the DB contract", () => {
    const dbTypesPath = resolve(process.cwd(), "app/_server/supabase/database.types.ts");
    const dbTypes = readFileSync(dbTypesPath, "utf8");

    expect(dbTypes).toContain("academy_reels");
    expect(dbTypes).toContain("generation_status");
    expect(dbTypes).toContain("hashtags: string | null");
    expect(dbTypes).not.toContain("hashtags: string[]");

    expect(dbTypes).toContain("academy_reel_generation_settings");
    expect(dbTypes).toContain("academy_reel_generation_queue_jobs");
    expect(dbTypes).toContain("academy_reel_generation_run_logs");
  });

  it("exposes the exact allowed statuses", () => {
    expect(REEL_BOARD_STATUSES).toEqual([
      "idea",
      "script",
      "to_record",
      "to_edit",
      "ready",
      "published",
    ]);
    expect(reelStatusSchema.parse("ready")).toBe("ready");
  });

  it("exposes the exact allowed generation statuses", () => {
    expect(REEL_GENERATION_STATUSES).toEqual([
      "not_generated",
      "processing",
      "completed",
      "failed",
    ]);
    expect(generationStatusSchema.parse("processing")).toBe("processing");
  });

  it("requires a trimmed non-empty idea on create", () => {
    expect(createReelSchema.safeParse({ idea: "   " }).success).toBe(false);
    expect(createReelSchema.parse({ idea: "  Hook  " })).toEqual({ idea: "Hook" });
  });

  it("supports all editable fields in the update payload", () => {
    expect(
      updateReelSchema.parse({
        title: "Title",
        caption: "Caption",
        body: "Body",
        hashtags: "#a #b",
        idea: "Idea",
        notes: "Notes",
        scheduled_at: "2026-05-11T09:00:00.000Z",
        published_at: "2026-05-11T10:00:00.000Z",
      }),
    ).toMatchObject({
      title: "Title",
      caption: "Caption",
      body: "Body",
      hashtags: "#a #b",
      idea: "Idea",
      notes: "Notes",
    });
  });

  it("groups board data and keeps owner scoping in service calls", async () => {
    const { createReel, deleteReel, getReelBoard, updateReel } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "user-1";

    repositoryMocks.listReelsByUser.mockResolvedValue({
      data: [
        {
          id: "reel-2",
          user_id: userId,
          status: "published",
          idea: "Published",
          title: null,
          caption: null,
          body: null,
          hashtags: null,
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T09:00:00.000Z",
          updated_at: "2026-05-11T10:00:00.000Z",
        },
        {
          id: "reel-1",
          user_id: userId,
          status: "idea",
          idea: "Draft",
          title: null,
          caption: null,
          body: null,
          hashtags: null,
          notes: null,
          scheduled_at: null,
          published_at: null,
          created_at: "2026-05-11T08:00:00.000Z",
          updated_at: "2026-05-11T11:00:00.000Z",
        },
      ],
      error: null,
    });
    repositoryMocks.insertReel.mockResolvedValue({
      data: {
        id: "reel-3",
        user_id: userId,
        status: "idea",
        idea: "New idea",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-11T12:00:00.000Z",
        updated_at: "2026-05-11T12:00:00.000Z",
      },
      error: null,
    });
    repositoryMocks.updateReelById.mockResolvedValue({
      data: {
        id: "reel-1",
        user_id: userId,
        status: "script",
        idea: "Draft",
        title: "Updated",
        caption: null,
        body: null,
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T11:30:00.000Z",
      },
      error: null,
    });
    repositoryMocks.deleteReelById.mockResolvedValue({ data: { id: "reel-1" }, error: null });

    const boardResult = await getReelBoard(supabase, userId);
    const createResult = await createReel(supabase, userId, { idea: "New idea" });
    const updateResult = await updateReel(supabase, userId, "reel-1", { title: "Updated" });
    const deleteResult = await deleteReel(supabase, userId, "reel-1");

    expect(repositoryMocks.listReelsByUser).toHaveBeenCalledWith(supabase, userId);
    expect(repositoryMocks.insertReel).toHaveBeenCalledWith(
      supabase,
      userId,
      expect.objectContaining({ idea: "New idea", status: "idea" }),
    );
    expect(repositoryMocks.updateReelById).toHaveBeenCalledWith(
      supabase,
      userId,
      "reel-1",
      expect.objectContaining({ title: "Updated" }),
    );
    expect(repositoryMocks.deleteReelById).toHaveBeenCalledWith(supabase, userId, "reel-1");

    expect(boardResult).toMatchObject({
      success: true,
      board: {
        columns: {
          idea: [{ id: "reel-1" }],
          published: [{ id: "reel-2" }],
        },
      },
    });
    expect(createResult).toMatchObject({ success: true, reel: { id: "reel-3", idea: "New idea" } });
    expect(updateResult).toMatchObject({ success: true, reel: { id: "reel-1", title: "Updated" } });
    expect(deleteResult).toMatchObject({ success: true, reelId: "reel-1" });
  });
});
