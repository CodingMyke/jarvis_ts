import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProgressionCheckin,
  createProgressionGoal,
  deleteProgressionGoal,
  ensureProgressionProfile,
  getProgressionGoalDetails,
  getProgressionGoals,
  getProgressionLevel,
  getProgressionStatus,
  getProgressionToday,
  getProgressionXpHistory,
  resolveProgressionDeadline,
  runProgressionGoalOperation,
  undoProgressionCheckin,
  updateProgressionGoal,
} from "./progression-client";

function createJsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function stubFetch(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("progression client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads progression status and normalizes API errors", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          status: "WARNING",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            success: false,
            error: "EXECUTION_ERROR",
            message: "db failed",
          },
          { status: 500 },
        ),
      );

    await expect(getProgressionStatus()).resolves.toMatchObject({
      success: true,
      status: "WARNING",
    });
    await expect(getProgressionStatus()).resolves.toEqual({
      success: false,
      error: "EXECUTION_ERROR",
      errorMessage: "db failed",
      status: 500,
    });
  });

  it("returns a controlled failure for the removed profile ensure helper", async () => {
    await expect(ensureProgressionProfile()).resolves.toEqual({
      success: false,
      error: "PROFILE_ENSURE_REMOVED",
      errorMessage: "Progression profile ensure moved to server-only user settings bootstrap.",
    });
  });

  it("calls status, goal, check-in, deadline and history endpoints", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(createJsonResponse({ success: true, goal: { id: "goal-1" } }));

    await getProgressionStatus();
    await getProgressionLevel();
    await getProgressionToday();
    await getProgressionGoals();
    await createProgressionGoal({ title: "Learn piano", completionXp: 20 });
    await updateProgressionGoal({ id: "goal-1", title: "Updated" });
    await runProgressionGoalOperation({ goalId: "goal-1", operation: "complete" });
    await getProgressionGoalDetails("goal-1");
    await deleteProgressionGoal("goal-1");
    await createProgressionCheckin("action-1");
    await undoProgressionCheckin("checkin-1");
    await resolveProgressionDeadline({ goalId: "goal-1", action: "fail" });
    await getProgressionXpHistory({ limit: 10, offset: 20 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/progression/status",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/progression/level",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/progression/today",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/progression/goals",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/progression/goals",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/progression/goals",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/progression/goals",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "/api/progression/goals?id=goal-1",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "/api/progression/goals?id=goal-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "/api/progression/check-ins",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      "/api/progression/check-ins?id=checkin-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      "/api/progression/deadlines",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      "/api/progression/xp-history?limit=10&offset=20",
    );
  });
});
