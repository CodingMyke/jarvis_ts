import { describe, expect, it, vi } from "vitest";
import { executeAutomationRunProcess } from "./reel-automation-runner.service";
import { processDueAutomationRuns } from "./reel-worker.service";

describe("reel-worker.service", () => {
  it("spawns one due run process per user and flow", async () => {
    const createAutomationRun = vi.fn()
      .mockResolvedValueOnce({
        id: "run-idea-1",
        user_id: "user-1",
        flow: "reel_idea_generation",
        trigger: "scheduled",
        slot: "2026-05-13T10:15:00.000Z",
        status: "queued",
      })
      .mockResolvedValueOnce({
        id: "run-script-1",
        user_id: "user-1",
        flow: "reel_scripting",
        trigger: "scheduled",
        slot: "2026-05-13T11:30:00.000Z",
        status: "queued",
      });
    const spawnRunProcess = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const result = await processDueAutomationRuns({} as never, {
      listSettings: vi.fn().mockResolvedValue([
        {
          user_id: "user-1",
          config: {
            reelScripting: { enabled: true, runTimes: ["11:30"], scriptingContext: null },
            reelIdeaGeneration: {
              enabled: true,
              runTimes: ["10:15"],
              ideasPerRun: 3,
              maxPendingAiIdeas: 10,
              latestPublishedReelsCount: 3,
              ideaGenerationContext: null,
            },
          },
          timezone: "UTC",
        },
      ]),
      hasActiveRun: vi.fn().mockResolvedValue(false),
      createAutomationRun,
      spawnRunProcess,
      updateAutomationRun: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-05-13T10:15:05.000Z"),
    });

    expect(result).toEqual({ discovered: 1, spawned: 1, failed: 0 });
    expect(createAutomationRun).toHaveBeenCalledWith(
      {} as never,
      expect.objectContaining({
        userId: "user-1",
        flow: "reel_idea_generation",
        trigger: "scheduled",
        status: "queued",
      }),
    );
    expect(spawnRunProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-idea-1",
        userId: "user-1",
        flow: "reel_idea_generation",
      }),
    );
  });

  it("does not create a run when the same flow already has an active run", async () => {
    const createAutomationRun = vi.fn().mockResolvedValue(undefined);

    const result = await processDueAutomationRuns({} as never, {
      listSettings: vi.fn().mockResolvedValue([
        {
          user_id: "user-1",
          config: {
            reelScripting: { enabled: true, runTimes: ["10:15"], scriptingContext: null },
            reelIdeaGeneration: {
              enabled: false,
              runTimes: [],
              ideasPerRun: 3,
              maxPendingAiIdeas: 10,
              latestPublishedReelsCount: 3,
              ideaGenerationContext: null,
            },
          },
          timezone: "UTC",
        },
      ]),
      hasActiveRun: vi.fn().mockResolvedValue(true),
      createAutomationRun,
      spawnRunProcess: vi.fn().mockResolvedValue({ success: true }),
      updateAutomationRun: vi.fn().mockResolvedValue(undefined),
      now: () => new Date("2026-05-13T10:15:00.000Z"),
    });

    expect(result).toEqual({ discovered: 0, spawned: 0, failed: 0 });
    expect(createAutomationRun).not.toHaveBeenCalled();
  });

  it("marks the spawned run lifecycle from queued to processing to completed", async () => {
    const updateAutomationRun = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    await executeAutomationRunProcess(
      {} as never,
      {
        runId: "run-1",
        flow: "reel_idea_generation",
        userId: "user-1",
        trigger: "scheduled",
        slot: "2026-05-13T10:15:00.000Z",
      },
      {
        updateAutomationRun,
        runIdeaGeneration: vi.fn().mockResolvedValue({
          success: true,
          runId: "run-1",
          requestedCount: 3,
          createdCount: 3,
          partial: false,
        }),
        runReelScripting: vi.fn().mockResolvedValue({ success: true }),
        now: () => new Date("2026-05-13T10:16:00.000Z"),
      },
    );

    expect(updateAutomationRun).toHaveBeenNthCalledWith(
      1,
      {} as never,
      "run-1",
      expect.objectContaining({ status: "processing" }),
    );
    expect(updateAutomationRun).toHaveBeenLastCalledWith(
      {} as never,
      "run-1",
      expect.objectContaining({ status: "completed" }),
    );
  });
});
