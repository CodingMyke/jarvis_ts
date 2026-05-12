import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  completeProgressionGoal: vi.fn(),
  createProgressionCheckin: vi.fn(),
  createProgressionGoal: vi.fn(),
  duplicateProgressionGoal: vi.fn(),
  ensureProgressionProfile: vi.fn(),
  getProgressionDeadlineReview: vi.fn(),
  getProgressionGoalDetails: vi.fn(),
  getProgressionGoals: vi.fn(),
  getProgressionLevel: vi.fn(),
  getProgressionOverview: vi.fn(),
  getProgressionStatus: vi.fn(),
  getProgressionToday: vi.fn(),
  getProgressionXpHistory: vi.fn(),
  resolveExpiredProgressionGoal: vi.fn(),
  softDeleteProgressionGoal: vi.fn(),
  startProgressionGoal: vi.fn(),
  undoProgressionCheckin: vi.fn(),
  updateProgressionGoal: vi.fn(),
}));

vi.mock("./progression.service", () => serviceMocks);

import type { AuthContext } from "@/app/_server/http/auth";
import {
  getProgressionUnauthorizedResponse,
  handleCreateProgressionCheckin,
  handleCreateProgressionGoal,
  handleDeleteProgressionGoal,
  handleGetProgressionDeadlineReview,
  handleEnsureProgressionProfile,
  handleGetProgressionDeadlines,
  handleGetProgressionGoalDetails,
  handleGetProgressionGoals,
  handleGetProgressionLevel,
  handleGetProgressionOverview,
  handleGetProgressionStatus,
  handleGetProgressionToday,
  handleGetProgressionXpHistory,
  handleResolveProgressionDeadline,
  handleUndoProgressionCheckin,
  handleUpdateProgressionGoal,
} from "./progression-route.handlers";

const auth = {
  supabase: {} as AuthContext["supabase"],
  userId: "123e4567-e89b-42d3-a456-426614174010",
} satisfies AuthContext;

const goalId = "123e4567-e89b-42d3-a456-426614174000";
const actionId = "123e4567-e89b-42d3-a456-426614174001";
const checkinId = "123e4567-e89b-42d3-a456-426614174002";

describe("progression route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a standardized unauthorized response", async () => {
    const response = getProgressionUnauthorizedResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "UNAUTHORIZED",
    });
  });

  it("validates overview queries and maps service failures", async () => {
    const invalid = await handleGetProgressionOverview(
      auth,
      new URLSearchParams("status=broken"),
    );
    serviceMocks.getProgressionOverview.mockResolvedValueOnce({
      success: false,
      error: "db failed",
    });

    const failure = await handleGetProgressionOverview(auth, new URLSearchParams());

    serviceMocks.getProgressionOverview.mockResolvedValueOnce({
      success: true,
      overview: { goals: [], deadlineWarning: false },
    });
    const success = await handleGetProgressionOverview(
      auth,
      new URLSearchParams("status=in_progress"),
    );

    expect(invalid.status).toBe(400);
    expect(failure.status).toBe(500);
    await expect(success.json()).resolves.toMatchObject({
      success: true,
      overview: { goals: [] },
    });
  });

  it("ensures profiles and creates goals", async () => {
    const invalidProfile = await handleEnsureProgressionProfile(auth, {});
    serviceMocks.ensureProgressionProfile.mockResolvedValueOnce({
      success: true,
      profile: { timezone: "Europe/Rome" },
    });
    const profile = await handleEnsureProgressionProfile(auth, {
      timezone: "Europe/Rome",
    });

    const invalidGoal = await handleCreateProgressionGoal(auth, { title: "" });
    serviceMocks.createProgressionGoal.mockResolvedValueOnce({
      success: true,
      goal: { id: goalId },
      actions: [],
    });
    const goal = await handleCreateProgressionGoal(auth, {
      title: "Learn piano",
      completionXp: 20,
    });

    expect(invalidProfile.status).toBe(400);
    await expect(profile.json()).resolves.toMatchObject({ success: true });
    expect(invalidGoal.status).toBe(400);
    await expect(goal.json()).resolves.toMatchObject({
      success: true,
      goal: { id: goalId },
    });
  });

  it("returns a minimal progression status contract", async () => {
    serviceMocks.getProgressionStatus.mockResolvedValueOnce({
      success: true,
      status: "OK",
    });
    const okResponse = await handleGetProgressionStatus(auth, {
      timezone: "Europe/Rome",
    });

    serviceMocks.getProgressionStatus.mockResolvedValueOnce({
      success: true,
      status: "WARNING",
    });
    const warningResponse = await handleGetProgressionStatus(auth, {
      timezone: "Europe/Rome",
    });

    await expect(okResponse.json()).resolves.toEqual({
      success: true,
      status: "OK",
    });
    await expect(warningResponse.json()).resolves.toEqual({
      success: true,
      status: "WARNING",
    });
  });

  it("returns split contracts for level, today and goals list", async () => {
    serviceMocks.getProgressionLevel.mockResolvedValueOnce({
      success: true,
      level: {
        profile: { timezone: "Europe/Rome", total_xp: 42 },
        levelProgress: { level: 3, totalXp: 42 },
      },
    });
    const level = await handleGetProgressionLevel(auth);

    serviceMocks.getProgressionToday.mockResolvedValueOnce({
      success: true,
      today: {
        todayItems: [{ id: actionId }],
        weeklyItems: [],
        todayLocalDate: "2026-05-02",
        timezone: "Europe/Rome",
      },
    });
    const today = await handleGetProgressionToday(auth);

    serviceMocks.getProgressionGoals.mockResolvedValueOnce({
      success: true,
      goals: [{ id: goalId }],
    });
    const goals = await handleGetProgressionGoals(auth, new URLSearchParams());

    await expect(level.json()).resolves.toMatchObject({
      success: true,
      level: {
        profile: { total_xp: 42 },
        levelProgress: { level: 3 },
      },
    });
    await expect(today.json()).resolves.toMatchObject({
      success: true,
      today: {
        todayItems: [{ id: actionId }],
        todayLocalDate: "2026-05-02",
        timezone: "Europe/Rome",
      },
    });
    await expect(goals.json()).resolves.toMatchObject({
      success: true,
      goals: [{ id: goalId }],
    });
  });

  it("handles goal details, updates, operations and deletes", async () => {
    serviceMocks.getProgressionGoalDetails.mockResolvedValueOnce({
      success: true,
      details: {
        goal: { id: goalId },
        actions: [{ id: actionId }],
      },
    });
    const details = await handleGetProgressionGoalDetails(auth, new URLSearchParams(`id=${goalId}`));

    serviceMocks.updateProgressionGoal.mockResolvedValueOnce({
      success: true,
      goal: { id: goalId, title: "Updated" },
    });
    const update = await handleUpdateProgressionGoal(auth, {
      id: goalId,
      title: "Updated",
    });

    serviceMocks.completeProgressionGoal.mockResolvedValueOnce({
      success: true,
      goal: { id: goalId, status: "completed" },
    });
    const complete = await handleUpdateProgressionGoal(auth, {
      goalId,
      operation: "complete",
    });

    serviceMocks.softDeleteProgressionGoal.mockResolvedValueOnce({
      success: true,
      goal: { id: goalId, deleted_at: "now" },
    });
    const deleted = await handleDeleteProgressionGoal(auth, {}, new URLSearchParams(`id=${goalId}`));

    await expect(details.json()).resolves.toMatchObject({
      success: true,
      goal: { id: goalId },
      actions: [{ id: actionId }],
    });
    await expect(update.json()).resolves.toMatchObject({ success: true, goal: { id: goalId } });
    await expect(complete.json()).resolves.toMatchObject({
      success: true,
      goal: { status: "completed" },
    });
    await expect(deleted.json()).resolves.toMatchObject({
      success: true,
      goal: { id: goalId },
    });
  });

  it("handles check-ins, deadlines and XP history", async () => {
    serviceMocks.createProgressionCheckin.mockResolvedValueOnce({
      success: true,
      checkin: { id: checkinId },
    });
    const checkin = await handleCreateProgressionCheckin(auth, { actionId });

    serviceMocks.undoProgressionCheckin.mockResolvedValueOnce({
      success: true,
      checkin: { id: checkinId },
    });
    const undo = await handleUndoProgressionCheckin(auth, { checkinId }, new URLSearchParams());

    serviceMocks.getProgressionDeadlineReview.mockResolvedValueOnce({
      success: true,
      review: { expiredGoals: [{ id: goalId }], deadlineWarning: true },
    });
    const deadlines = await handleGetProgressionDeadlines(auth);

    serviceMocks.resolveExpiredProgressionGoal.mockResolvedValueOnce({
      success: true,
      goal: { id: goalId, deadline: "2026-05-10" },
    });
    const resolved = await handleResolveProgressionDeadline(auth, {
      goalId,
      action: "postpone",
      newDeadline: "2026-05-10",
    });

    serviceMocks.getProgressionXpHistory.mockResolvedValueOnce({
      success: true,
      history: [{ id: "xp-1" }],
    });
    const history = await handleGetProgressionXpHistory(auth, new URLSearchParams("limit=10"));

    await expect(checkin.json()).resolves.toMatchObject({ success: true });
    await expect(undo.json()).resolves.toMatchObject({ success: true });
    await expect(deadlines.json()).resolves.toMatchObject({
      success: true,
      deadlineWarning: true,
    });
    await expect(resolved.json()).resolves.toMatchObject({ success: true });
    await expect(history.json()).resolves.toMatchObject({ success: true, count: 1 });
  });

  it("returns deadline review data without the overview payload", async () => {
    serviceMocks.getProgressionDeadlineReview.mockResolvedValueOnce({
      success: true,
      review: {
        deadlineWarning: true,
        expiredGoals: [{ id: goalId }],
      },
    });

    const response = await handleGetProgressionDeadlineReview(auth);

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      deadlineWarning: true,
      expiredGoals: [{ id: goalId }],
      count: 1,
    });
  });
});
