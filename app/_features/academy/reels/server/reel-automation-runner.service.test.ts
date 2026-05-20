import { beforeEach, describe, expect, it, vi } from "vitest";

const ideaGenerationRepositoryMocks = vi.hoisted(() => ({
  updateAutomationRun: vi.fn(),
}));

const ideaGenerationServiceMocks = vi.hoisted(() => ({
  runReelIdeaGeneration: vi.fn(),
}));

const generationRepositoryMocks = vi.hoisted(() => ({
  listIdeaReelIdsByUser: vi.fn(),
}));

const generationServiceMocks = vi.hoisted(() => ({
  generateReelFields: vi.fn(),
}));

vi.mock("./reel-idea-generation.repository", () => ideaGenerationRepositoryMocks);
vi.mock("./reel-idea-generation.service", () => ideaGenerationServiceMocks);
vi.mock("./reel-generation.repository", () => generationRepositoryMocks);
vi.mock("./reel-generation.service", () => generationServiceMocks);

import { executeAutomationRunProcess } from "./reel-automation-runner.service";

describe("reel-automation-runner.service", () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    ideaGenerationRepositoryMocks.updateAutomationRun.mockResolvedValue({
      data: { id: "run-1" },
      error: null,
    });
  });

  it("reuses the queued run id when executing reel idea generation", async () => {
    ideaGenerationServiceMocks.runReelIdeaGeneration.mockResolvedValue({
      success: true,
      runId: "run-1",
      requestedCount: 3,
      createdCount: 2,
      partial: true,
    });

    const result = await executeAutomationRunProcess(supabase, {
      runId: "run-1",
      userId: "user-1",
      flow: "reel_idea_generation",
      trigger: "scheduled",
      slot: "2026-05-20T09:00:00.000Z",
    });

    expect(ideaGenerationServiceMocks.runReelIdeaGeneration).toHaveBeenCalledWith(supabase, {
      userId: "user-1",
      trigger: "scheduled",
      slot: "2026-05-20T09:00:00.000Z",
      existingRunId: "run-1",
    });
    expect(result).toEqual({ success: true, message: undefined });
  });

  it("executes reel scripting against current idea reels", async () => {
    generationRepositoryMocks.listIdeaReelIdsByUser.mockResolvedValue({
      data: [{ id: "reel-1" }, { id: "reel-2" }],
      error: null,
    });
    generationServiceMocks.generateReelFields
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const result = await executeAutomationRunProcess(supabase, {
      runId: "run-2",
      userId: "user-1",
      flow: "reel_scripting",
      trigger: "scheduled",
      slot: "2026-05-20T10:00:00.000Z",
    });

    expect(generationRepositoryMocks.listIdeaReelIdsByUser).toHaveBeenCalledWith(supabase, "user-1");
    expect(generationServiceMocks.generateReelFields).toHaveBeenCalledTimes(2);
    expect(generationServiceMocks.generateReelFields).toHaveBeenNthCalledWith(1, supabase, "user-1", "reel-1");
    expect(generationServiceMocks.generateReelFields).toHaveBeenNthCalledWith(2, supabase, "user-1", "reel-2");
    expect(result).toEqual({ success: true, message: undefined });
    expect(ideaGenerationRepositoryMocks.updateAutomationRun).toHaveBeenLastCalledWith(
      supabase,
      "run-2",
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({
          processedCount: 2,
          failedCount: 0,
        }),
      }),
    );
  });
});
