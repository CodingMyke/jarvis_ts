import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REEL_BOARD_STATUSES } from "../lib/reel-board.constants";
import type { ReelRow, ReelStatus } from "../lib/reel-board.types";
import {
  createReelSchema,
  generationStatusSchema,
  reelStatusSchema,
  updateReelSchema,
} from "../lib/reel-board.schemas";
import { REEL_GENERATION_STATUSES } from "../lib/reel-board.constants";

const repositoryMocks = vi.hoisted(() => ({
  listReelsByUser: vi.fn(),
  getReelById: vi.fn(),
  insertReel: vi.fn(),
  updateReelById: vi.fn(),
  insertTransitionEvent: vi.fn(),
  saveRejectedIdeaSnapshot: vi.fn(),
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
    const migrationPath = resolve(
      process.cwd(),
      "supabase/migrations/20260519000000_add_reel_idea_generation_flow.sql",
    );
    const migration = readFileSync(migrationPath, "utf8");

    expect(dbTypes).toContain("academy_reels");
    expect(dbTypes).toContain("generation_status");
    expect(dbTypes).toContain("origin: string");
    expect(dbTypes).toContain("last_idea_generation_run_id: string | null");
    expect(dbTypes).toContain("hashtags: string | null");
    expect(dbTypes).not.toContain("hashtags: string[]");

    expect(dbTypes).toContain("academy_reel_generation_settings");
    expect(dbTypes).toContain("academy_reel_generation_queue_jobs");
    expect(dbTypes).toContain("academy_reel_generation_run_logs");
    expect(dbTypes).toContain("academy_reel_rejected_ideas");
    expect(dbTypes).toContain("academy_reel_automation_runs");
    expect(dbTypes).toContain("academy_reel_transition_events");

    expect(migration).toContain("ai_idea");
    expect(migration).toContain("add column origin text not null default 'manual'");
    expect(migration).toContain("add column last_idea_generation_run_id uuid");
    expect(migration).toContain("create table public.academy_reel_rejected_ideas");
    expect(migration).toContain("create table public.academy_reel_automation_runs");
    expect(migration).toContain("create table public.academy_reel_transition_events");
  });

  it("exposes typed ai idea contract fields", () => {
    expectTypeOf<ReelStatus>().toEqualTypeOf<
      "ai_idea" | "idea" | "script" | "to_record" | "to_edit" | "ready" | "published"
    >();
    expectTypeOf<ReelRow["origin"]>().toEqualTypeOf<"manual" | "ai_idea_generation" | string>();
    expectTypeOf<ReelRow["last_idea_generation_run_id"]>().toEqualTypeOf<string | null>();
  });

  it("exposes the exact allowed statuses", () => {
    expect(REEL_BOARD_STATUSES).toEqual([
      "ai_idea",
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
          origin: "manual",
          last_idea_generation_run_id: null,
          generation_status: "completed",
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
          status: "ai_idea",
          origin: "ai_idea_generation",
          last_idea_generation_run_id: "44444444-4444-4444-8444-444444444444",
          generation_status: "processing",
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
        origin: "manual",
        last_idea_generation_run_id: null,
        generation_status: "not_generated",
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
        origin: "ai_idea_generation",
        last_idea_generation_run_id: "44444444-4444-4444-8444-444444444444",
        generation_status: "completed",
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
    repositoryMocks.getReelById.mockResolvedValue({
      data: {
        id: "reel-1",
        user_id: userId,
        status: "script",
        origin: "ai_idea_generation",
        last_idea_generation_run_id: "44444444-4444-4444-8444-444444444444",
        generation_status: "completed",
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
          ai_idea: [{ id: "reel-1", origin: "ai_idea_generation" }],
          published: [{ id: "reel-2" }],
        },
      },
    });
    expect(createResult).toMatchObject({ success: true, reel: { id: "reel-3", idea: "New idea" } });
    expect(updateResult).toMatchObject({ success: true, reel: { id: "reel-1", title: "Updated" } });
    expect(deleteResult).toMatchObject({ success: true, reelId: "reel-1" });
  });

  it("prevents manual moves into ai_idea", async () => {
    const { updateReelStatus } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "11111111-1111-4111-8111-111111111111";
    const reelId = "22222222-2222-4222-8222-222222222222";

    const result = await updateReelStatus(supabase, userId, reelId, { status: "ai_idea" });

    expect(result).toEqual({
      success: false,
      error: "INVALID_STATUS_TRANSITION",
      message: "Only Reel Idea Generation may place reels in ai_idea",
    });
    expect(repositoryMocks.getReelById).not.toHaveBeenCalled();
    expect(repositoryMocks.updateReelById).not.toHaveBeenCalled();
  });

  it("keeps origin immutable across reel edits", async () => {
    const { updateReel } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "11111111-1111-4111-8111-111111111111";
    const reelId = "22222222-2222-4222-8222-222222222222";

    const result = await updateReel(supabase, userId, reelId, {
      title: "Edited",
      // @ts-expect-error test payload intentionally invalid
      origin: "manual",
    });

    expect(result).toEqual({
      success: false,
      error: "IMMUTABLE_FIELD",
      message: "origin cannot be changed",
    });
    expect(repositoryMocks.updateReelById).not.toHaveBeenCalled();
  });

  it("records approve and manual move as distinct transition events", async () => {
    const { approveAiIdea, updateReelStatus } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "11111111-1111-4111-8111-111111111111";
    const reelId = "22222222-2222-4222-8222-222222222222";
    const aiIdeaReel = {
      id: reelId,
      user_id: userId,
      status: "ai_idea",
      origin: "ai_idea_generation",
      last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333",
      generation_status: "processing",
      idea: "AI draft",
      title: null,
      caption: null,
      body: null,
      hashtags: null,
      notes: null,
      scheduled_at: null,
      published_at: null,
      created_at: "2026-05-11T08:00:00.000Z",
      updated_at: "2026-05-11T09:00:00.000Z",
    };

    repositoryMocks.getReelById.mockResolvedValue({ data: aiIdeaReel, error: null });
    repositoryMocks.updateReelById.mockResolvedValue({
      data: { ...aiIdeaReel, status: "idea", idea: "Approved idea" },
      error: null,
    });
    repositoryMocks.insertTransitionEvent.mockResolvedValue({ data: null, error: null });

    await approveAiIdea(supabase, userId, reelId, { idea: "Approved idea" });

    expect(repositoryMocks.insertTransitionEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        action: "approve_ai_idea",
        from_status: "ai_idea",
        to_status: "idea",
      }),
    );

    repositoryMocks.getReelById.mockResolvedValue({ data: aiIdeaReel, error: null });
    repositoryMocks.updateReelById.mockResolvedValue({
      data: { ...aiIdeaReel, status: "script" },
      error: null,
    });

    await updateReelStatus(supabase, userId, reelId, { status: "script" });

    expect(repositoryMocks.insertTransitionEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        action: "manual_move",
        from_status: "ai_idea",
        to_status: "script",
      }),
    );
  });

  it("stores rejected idea snapshot before deleting an ai_idea reel", async () => {
    const { deleteReel } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "11111111-1111-4111-8111-111111111111";
    const reelId = "22222222-2222-4222-8222-222222222222";

    repositoryMocks.getReelById.mockResolvedValue({
      data: {
        id: reelId,
        user_id: userId,
        status: "ai_idea",
        origin: "ai_idea_generation",
        last_idea_generation_run_id: "33333333-3333-4333-8333-333333333333",
        generation_status: "processing",
        idea: "AI draft",
        title: "Title",
        caption: "Caption",
        body: "Body",
        hashtags: "#a #b",
        notes: "Notes",
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T09:00:00.000Z",
      },
      error: null,
    });
    repositoryMocks.saveRejectedIdeaSnapshot.mockResolvedValue({ data: null, error: null });
    repositoryMocks.deleteReelById.mockResolvedValue({ data: { id: reelId }, error: null });

    const result = await deleteReel(supabase, userId, reelId);

    expect(repositoryMocks.saveRejectedIdeaSnapshot).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        reel_id: reelId,
        origin: "ai_idea_generation",
      }),
    );
    expect(result).toMatchObject({ success: true, reelId });
  });

  it("updates published_at when entering and leaving published", async () => {
    const { updateReelStatus } = await import("./reel-board.service");
    const supabase = {} as never;
    const userId = "11111111-1111-4111-8111-111111111111";
    const reelId = "22222222-2222-4222-8222-222222222222";

    repositoryMocks.getReelById.mockResolvedValueOnce({
      data: {
        id: reelId,
        user_id: userId,
        status: "ready",
        origin: "manual",
        last_idea_generation_run_id: null,
        generation_status: "completed",
        idea: "Ready reel",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T09:00:00.000Z",
      },
      error: null,
    });
    repositoryMocks.updateReelById.mockResolvedValueOnce({
      data: { id: reelId, status: "published", published_at: "2026-05-11T10:00:00.000Z" },
      error: null,
    });

    await updateReelStatus(supabase, userId, reelId, { status: "published" });

    expect(repositoryMocks.updateReelById).toHaveBeenNthCalledWith(
      1,
      supabase,
      userId,
      reelId,
      expect.objectContaining({
        status: "published",
        published_at: expect.any(String),
      }),
    );

    repositoryMocks.getReelById.mockResolvedValueOnce({
      data: {
        id: reelId,
        user_id: userId,
        status: "published",
        origin: "manual",
        last_idea_generation_run_id: null,
        generation_status: "completed",
        idea: "Published reel",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: "2026-05-11T10:00:00.000Z",
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T09:00:00.000Z",
      },
      error: null,
    });
    repositoryMocks.updateReelById.mockResolvedValueOnce({
      data: { id: reelId, status: "ready", published_at: null },
      error: null,
    });

    await updateReelStatus(supabase, userId, reelId, { status: "ready" });

    expect(repositoryMocks.updateReelById).toHaveBeenNthCalledWith(
      2,
      supabase,
      userId,
      reelId,
      expect.objectContaining({
        status: "ready",
        published_at: null,
      }),
    );
  });
});
