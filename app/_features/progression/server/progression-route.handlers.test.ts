import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  completeProgressionGoal: vi.fn(),
  createProgressionCheckin: vi.fn(),
  createProgressionGoal: vi.fn(),
  duplicateProgressionGoal: vi.fn(),
  ensureProgressionProfile: vi.fn(),
  getProgressionOverview: vi.fn(),
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
  handleEnsureProgressionProfile,
  handleGetProgressionDeadlines,
  handleGetProgressionGoals,
  handleGetProgressionOverview,
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

  it("handles goal list, updates, operations and deletes", async () => {
    serviceMocks.getProgressionOverview.mockResolvedValueOnce({
      success: true,
      overview: { goals: [{ id: goalId }], actions: [] },
    });
    const list = await handleGetProgressionGoals(auth, new URLSearchParams("status=all"));

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

    await expect(list.json()).resolves.toMatchObject({ success: true, count: 1 });
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

    serviceMocks.getProgressionOverview.mockResolvedValueOnce({
      success: true,
      overview: { expiredGoals: [{ id: goalId }], deadlineWarning: true },
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
});
