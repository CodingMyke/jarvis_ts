import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  triggerManualReelIdeaGeneration: vi.fn(),
}));

vi.mock("./reel-idea-generation.service", () => serviceMocks);

import { handleTriggerManualReelIdeaGeneration } from "./reel-idea-generation-route.handlers";

describe("reel idea generation route handlers", () => {
  const auth = { supabase: {} as never, userId: "user-1" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers manual idea generation", async () => {
    serviceMocks.triggerManualReelIdeaGeneration.mockResolvedValue({
      success: true,
      runId: "run-1",
      requestedCount: 3,
      createdCount: 2,
      partial: true,
    });

    const response = await handleTriggerManualReelIdeaGeneration(auth);

    expect(serviceMocks.triggerManualReelIdeaGeneration).toHaveBeenCalledWith(auth.supabase, {
      userId: auth.userId,
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      runId: "run-1",
      requestedCount: 3,
      createdCount: 2,
      partial: true,
    });
  });

  it("maps active-run conflicts to 409", async () => {
    serviceMocks.triggerManualReelIdeaGeneration.mockResolvedValue({
      success: false,
      error: "FLOW_ALREADY_RUNNING",
      message: "Idea generation already running",
    });

    const response = await handleTriggerManualReelIdeaGeneration(auth);

    expect(response.status).toBe(409);
  });
});
