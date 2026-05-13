import { describe, expect, it, vi } from "vitest";
import {
  enqueueScheduledIdeaReels,
  pickNextReelGenerationJob,
  processNextReelGenerationJob,
} from "./reel-worker.service";

describe("reel-worker.service", () => {
  it("prioritizes manual jobs over scheduled jobs", () => {
    const selected = pickNextReelGenerationJob([
      {
        id: "scheduled-1",
        user_id: "user-1",
        reel_id: "reel-1",
        run_at: "2026-05-13T09:00:00.000Z",
        trigger_source: "scheduled",
      },
      {
        id: "manual-1",
        user_id: "user-1",
        reel_id: "reel-2",
        run_at: "2026-05-13T10:00:00.000Z",
        trigger_source: "manual_global",
      },
    ]);

    expect(selected?.id).toBe("manual-1");
  });

  it("processes one job end-to-end and records logs", async () => {
    const updateJob = vi.fn().mockResolvedValue({ error: null });
    const insertLog = vi.fn().mockResolvedValue(undefined);

    const result = await processNextReelGenerationJob({} as never, {
      listSettings: vi.fn().mockResolvedValue([]),
      listIdeaReelIds: vi.fn().mockResolvedValue([]),
      listActiveQueueReelIds: vi.fn().mockResolvedValue([]),
      hasJobForSlot: vi.fn().mockResolvedValue(false),
      insertScheduledJobs: vi.fn().mockResolvedValue(undefined),
      listJobs: vi.fn().mockResolvedValue([
        {
          id: "manual-1",
          user_id: "user-1",
          reel_id: "reel-1",
          run_at: "2026-05-13T10:00:00.000Z",
          trigger_source: "manual_field",
          target_field: "caption",
        },
      ]),
      updateJob,
      generateGlobal: vi.fn().mockResolvedValue({ success: true }),
      generateField: vi.fn().mockResolvedValue({ success: true }),
      insertLog,
      now: () => new Date("2026-05-13T10:01:00.000Z"),
    });

    expect(result).toEqual({ processed: true });
    expect(updateJob).toHaveBeenCalledTimes(2);
    expect(insertLog).toHaveBeenCalledTimes(2);
  });

  it("enqueues all idea reels on due time without duplicating existing queued reels", async () => {
    const insertedJobs: Array<{ userId: string; reelId: string; runAt: string }> = [];

    const enqueued = await enqueueScheduledIdeaReels({} as never, {
      listJobs: vi.fn().mockResolvedValue([]),
      listSettings: vi.fn().mockResolvedValue([
        {
          user_id: "user-1",
          config: { enabled: true, runTimes: ["10:15"] },
        },
      ]),
      listIdeaReelIds: vi.fn().mockResolvedValue(["reel-1", "reel-2", "reel-3"]),
      listActiveQueueReelIds: vi.fn().mockResolvedValue(["reel-2"]),
      hasJobForSlot: vi.fn().mockResolvedValue(false),
      insertScheduledJobs: vi.fn(async (_supabase, jobs) => {
        insertedJobs.push(...jobs);
      }),
      updateJob: vi.fn().mockResolvedValue({ error: null }),
      generateGlobal: vi.fn().mockResolvedValue({ success: true }),
      generateField: vi.fn().mockResolvedValue({ success: true }),
      insertLog: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-05-13T10:15:05.000Z"),
    });

    expect(enqueued).toBe(2);
    expect(insertedJobs.map((job) => job.reelId)).toEqual(["reel-1", "reel-3"]);
  });

  it("does not enqueue again if slot already has jobs", async () => {
    const insertScheduledJobs = vi.fn().mockResolvedValue(undefined);

    const enqueued = await enqueueScheduledIdeaReels({} as never, {
      listJobs: vi.fn().mockResolvedValue([]),
      listSettings: vi.fn().mockResolvedValue([
        {
          user_id: "user-1",
          config: { enabled: true, runTimes: ["10:15"] },
        },
      ]),
      listIdeaReelIds: vi.fn().mockResolvedValue(["reel-1"]),
      listActiveQueueReelIds: vi.fn().mockResolvedValue([]),
      hasJobForSlot: vi.fn().mockResolvedValue(true),
      insertScheduledJobs,
      updateJob: vi.fn().mockResolvedValue({ error: null }),
      generateGlobal: vi.fn().mockResolvedValue({ success: true }),
      generateField: vi.fn().mockResolvedValue({ success: true }),
      insertLog: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-05-13T10:15:10.000Z"),
    });

    expect(enqueued).toBe(0);
    expect(insertScheduledJobs).not.toHaveBeenCalled();
  });
});
