import { describe, expect, it, vi } from "vitest";
import { pickNextReelGenerationJob, processNextReelGenerationJob } from "./reel-worker.service";

describe("reel-worker.service", () => {
  it("prioritizes manual jobs over scheduled jobs", () => {
    const selected = pickNextReelGenerationJob([
      {
        id: "scheduled-1",
        reel_id: "reel-1",
        run_at: "2026-05-13T09:00:00.000Z",
        trigger_source: "scheduled",
      },
      {
        id: "manual-1",
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

    const result = await processNextReelGenerationJob(
      {} as never,
      "user-1",
      {
        listJobs: vi.fn().mockResolvedValue([
          {
            id: "manual-1",
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
      },
    );

    expect(result).toEqual({ processed: true });
    expect(updateJob).toHaveBeenCalledTimes(2);
    expect(insertLog).toHaveBeenCalledTimes(2);
  });
});
