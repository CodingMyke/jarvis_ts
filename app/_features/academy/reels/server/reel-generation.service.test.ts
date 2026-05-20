import { beforeEach, describe, expect, it, vi } from "vitest";

const boardRepositoryMocks = vi.hoisted(() => ({
  getReelById: vi.fn(),
  updateReelById: vi.fn(),
}));

const generationRepositoryMocks = vi.hoisted(() => ({
  getGenerationSettingsByUser: vi.fn(),
  insertRunLog: vi.fn(),
}));

const llmMocks = vi.hoisted(() => ({
  generateReelGenerationObject: vi.fn(),
}));

vi.mock("./reel-board.repository", () => boardRepositoryMocks);
vi.mock("./reel-generation.repository", () => generationRepositoryMocks);
vi.mock("@/app/_server/ai/llm/openai-reel-generation", () => llmMocks);

import { generateReelFields, generateReelField } from "./reel-generation.service";

describe("reel generation service", () => {
  const supabase = {} as never;
  const userId = "user-1";
  const reelId = "reel-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("global mode requests only missing fields and completes generation status", async () => {
    boardRepositoryMocks.getReelById.mockResolvedValue({
      data: {
        id: reelId,
        user_id: userId,
        status: "idea",
        generation_status: "not_generated",
        idea: "Idea",
        title: null,
        caption: null,
        body: "Existing body",
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-13T10:00:00.000Z",
        updated_at: "2026-05-13T10:00:00.000Z",
      },
      error: null,
    });
    generationRepositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          reelScripting: { enabled: false, runTimes: [], scriptingContext: "ctx" },
          reelIdeaGeneration: {
            enabled: false,
            runTimes: [],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: null,
          },
        },
      },
      error: null,
    });
    llmMocks.generateReelGenerationObject.mockResolvedValue({
      object: { title: "T", caption: "C", hashtags: "#a #b" },
      rawText: "raw",
    });
    boardRepositoryMocks.updateReelById.mockResolvedValue({
      data: { id: reelId, generation_status: "completed", status: "script" },
      error: null,
    });

    const result = await generateReelFields(supabase, userId, reelId);

    expect(llmMocks.generateReelGenerationObject).toHaveBeenCalledWith(
      expect.objectContaining({ targetFields: ["title", "caption", "hashtags"] }),
    );
    expect(boardRepositoryMocks.updateReelById).toHaveBeenCalledWith(
      supabase,
      userId,
      reelId,
      expect.objectContaining({
        title: "T",
        caption: "C",
        hashtags: "#a #b",
        generation_status: "completed",
        status: "script",
      }),
    );
    expect(result).toMatchObject({ success: true });
  });

  it("field mode requests only the selected field and never changes kanban status", async () => {
    boardRepositoryMocks.getReelById.mockResolvedValue({
      data: {
        id: reelId,
        user_id: userId,
        status: "ready",
        generation_status: "completed",
        idea: "Idea",
        title: "Existing",
        caption: null,
        body: null,
        hashtags: null,
        notes: null,
        scheduled_at: null,
        published_at: null,
        created_at: "2026-05-13T10:00:00.000Z",
        updated_at: "2026-05-13T10:00:00.000Z",
      },
      error: null,
    });
    generationRepositoryMocks.getGenerationSettingsByUser.mockResolvedValue({
      data: {
        user_id: userId,
        config: {
          reelScripting: { enabled: false, runTimes: [], scriptingContext: null },
          reelIdeaGeneration: {
            enabled: false,
            runTimes: [],
            ideasPerRun: 3,
            maxPendingAiIdeas: 10,
            latestPublishedReelsCount: 3,
            ideaGenerationContext: null,
          },
        },
      },
      error: null,
    });
    llmMocks.generateReelGenerationObject.mockResolvedValue({
      object: { caption: "New caption" },
      rawText: "raw",
    });
    boardRepositoryMocks.updateReelById.mockResolvedValue({
      data: { id: reelId, generation_status: "completed", status: "ready" },
      error: null,
    });

    const result = await generateReelField(supabase, userId, reelId, "caption");

    expect(llmMocks.generateReelGenerationObject).toHaveBeenCalledWith(
      expect.objectContaining({ targetFields: ["caption"] }),
    );
    expect(boardRepositoryMocks.updateReelById).toHaveBeenCalledWith(
      supabase,
      userId,
      reelId,
      expect.objectContaining({
        caption: "New caption",
        generation_status: "completed",
      }),
    );
    expect(boardRepositoryMocks.updateReelById).toHaveBeenCalledWith(
      supabase,
      userId,
      reelId,
      expect.not.objectContaining({ status: expect.anything() }),
    );
    expect(result).toMatchObject({ success: true });
  });
});
