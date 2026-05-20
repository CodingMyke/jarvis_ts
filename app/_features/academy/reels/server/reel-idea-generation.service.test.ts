import { beforeEach, describe, expect, it, vi } from "vitest";

const settingsRepositoryMocks = vi.hoisted(() => ({
  getGenerationSettingsByUser: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  hasActiveFlowRun: vi.fn(),
  insertAutomationRun: vi.fn(),
  updateAutomationRun: vi.fn(),
  countPendingAiIdeas: vi.fn(),
  listLatestPublishedReels: vi.fn(),
  listRecentSemanticMemories: vi.fn(),
  listRecentEpisodicMemories: vi.fn(),
  listRecentRejectedIdeas: vi.fn(),
  insertGeneratedAiIdeas: vi.fn(),
}));

const aiSdkMocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
}));

const openAiMocks = vi.hoisted(() => ({
  openai: vi.fn(() => "openai-model"),
}));

vi.mock("./reel-generation.repository", () => settingsRepositoryMocks);
vi.mock("./reel-idea-generation.repository", () => repositoryMocks);
vi.mock("ai", () => aiSdkMocks);
vi.mock("@ai-sdk/openai", () => openAiMocks);

import { runReelIdeaGeneration, triggerManualReelIdeaGeneration } from "./reel-idea-generation.service";

describe("reel idea generation service", () => {
  const supabase = {} as never;
  const userId = "user-1";
  const runId = "run-1";

  beforeEach(() => {
    vi.clearAllMocks();

    settingsRepositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          reelScripting: { enabled: false, runTimes: [], scriptingContext: null },
          reelIdeaGeneration: {
            enabled: false,
            runTimes: ["09:00"],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: "Follow the user's positioning.",
          },
        },
      },
      error: null,
    });

    repositoryMocks.hasActiveFlowRun.mockResolvedValue(false);
    repositoryMocks.insertAutomationRun.mockResolvedValue({
      data: { id: runId },
      error: null,
    });
    repositoryMocks.updateAutomationRun.mockResolvedValue({
      data: { id: runId },
      error: null,
    });
    repositoryMocks.countPendingAiIdeas.mockResolvedValue({ count: 0, error: null });
    repositoryMocks.listLatestPublishedReels.mockResolvedValue({
      data: [{ idea: "Published idea", title: "Published title", origin: "manual" }],
      error: null,
    });
    repositoryMocks.listRecentSemanticMemories.mockResolvedValue({
      data: [{ id: "sem-1", content: "Semantic memory", created_at: "2026-05-19T08:00:00.000Z" }],
      error: null,
    });
    repositoryMocks.listRecentEpisodicMemories.mockResolvedValue({
      data: [{ id: "epi-1", content: "Episodic memory", created_at: "2026-05-19T08:05:00.000Z" }],
      error: null,
    });
    repositoryMocks.listRecentRejectedIdeas.mockResolvedValue({
      data: [{ idea: "Rejected idea", rejected_at: "2026-05-19T07:00:00.000Z" }],
      error: null,
    });
    repositoryMocks.insertGeneratedAiIdeas.mockResolvedValue({
      data: [{ id: "reel-1" }],
      error: null,
    });
    aiSdkMocks.generateObject.mockResolvedValue({
      object: {
        ideas: [
          { idea: "Idea A", notes: "Note A" },
          { idea: "Idea B", notes: "Note B" },
          { idea: "Idea C", notes: "Note C" },
        ],
      },
    });
  });

  it("builds prompt context from published reels, memories, and rejected ideas", async () => {
    await runReelIdeaGeneration(supabase, {
      userId,
      trigger: "manual",
      slot: null,
    });

    expect(repositoryMocks.listLatestPublishedReels).toHaveBeenCalledWith(supabase, userId, 3);
    expect(repositoryMocks.listRecentSemanticMemories).toHaveBeenCalledWith(supabase, userId, 5);
    expect(repositoryMocks.listRecentEpisodicMemories).toHaveBeenCalledWith(supabase, userId, 5);
    expect(repositoryMocks.listRecentRejectedIdeas).toHaveBeenCalledWith(supabase, userId, 10);
    expect(aiSdkMocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai-model",
        system: "Follow the user's positioning.",
        prompt: expect.stringContaining("Published idea"),
      }),
    );
    expect(aiSdkMocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Semantic memory"),
      }),
    );
    expect(aiSdkMocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Episodic memory"),
      }),
    );
    expect(aiSdkMocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Rejected idea"),
      }),
    );
  });

  it("saves partial idea batches and records partial metadata", async () => {
    aiSdkMocks.generateObject.mockResolvedValue({
      object: {
        ideas: [{ idea: "Idea A" }, { idea: "Idea B" }, { idea: "   " }],
      },
    });

    const result = await runReelIdeaGeneration(supabase, {
      userId,
      trigger: "scheduled",
      slot: "2026-05-19T09:00:00.000Z",
    });

    expect(aiSdkMocks.generateObject).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.insertGeneratedAiIdeas).toHaveBeenCalledWith(
      supabase,
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          status: "ai_idea",
          origin: "ai_idea_generation",
          generation_status: "not_generated",
          last_idea_generation_run_id: runId,
        }),
      ]),
    );
    expect(repositoryMocks.updateAutomationRun).toHaveBeenCalledWith(
      supabase,
      runId,
      expect.objectContaining({
        status: "completed",
        metadata: expect.objectContaining({
          partial: true,
          requestedCount: 3,
          createdCount: 2,
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      requestedCount: 3,
      createdCount: 2,
      partial: true,
    });
  });

  it("rejects a manual trigger when the same flow already has an active run", async () => {
    repositoryMocks.hasActiveFlowRun.mockResolvedValue(true);

    const result = await triggerManualReelIdeaGeneration(supabase, { userId });

    expect(result).toEqual({
      success: false,
      error: "FLOW_ALREADY_RUNNING",
      message: "Idea generation already running",
    });
    expect(aiSdkMocks.generateObject).not.toHaveBeenCalled();
  });

  it("allows manual idea generation even when automatic scheduling is disabled", async () => {
    settingsRepositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          reelScripting: { enabled: false, runTimes: [], scriptingContext: null },
          reelIdeaGeneration: {
            enabled: false,
            runTimes: ["09:00"],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: null,
          },
        },
      },
      error: null,
    });

    const result = await triggerManualReelIdeaGeneration(supabase, { userId });

    expect(result).toMatchObject({ success: true, createdCount: 3 });
  });

  it("reuses the provided automation run id inside spawned processes without creating a nested run", async () => {
    const result = await runReelIdeaGeneration(supabase, {
      userId,
      trigger: "scheduled",
      slot: "2026-05-19T09:00:00.000Z",
      existingRunId: "existing-run-1",
    });

    expect(repositoryMocks.hasActiveFlowRun).not.toHaveBeenCalled();
    expect(repositoryMocks.insertAutomationRun).not.toHaveBeenCalled();
    expect(repositoryMocks.updateAutomationRun).not.toHaveBeenCalled();
    expect(repositoryMocks.insertGeneratedAiIdeas).toHaveBeenCalledWith(
      supabase,
      expect.arrayContaining([
        expect.objectContaining({
          last_idea_generation_run_id: "existing-run-1",
        }),
      ]),
    );
    expect(result).toMatchObject({
      success: true,
      runId: "existing-run-1",
      createdCount: 3,
    });
  });
});
