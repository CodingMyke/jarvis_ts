import { describe, expect, it } from "vitest";
import {
  progressionCheckinCreateBodySchema,
  progressionDeadlineReviewBodySchema,
  progressionGoalCreateBodySchema,
  progressionGoalOperationBodySchema,
  progressionGoalUpdateBodySchema,
  progressionRecurringActionInputSchema,
} from "./progression-route.schemas";

const goalId = "123e4567-e89b-42d3-a456-426614174000";
const actionId = "123e4567-e89b-42d3-a456-426614174001";

describe("progression route schemas", () => {
  it("trims goal text fields and requires a title", () => {
    const parsed = progressionGoalCreateBodySchema.safeParse({
      title: "  Learn piano  ",
      description: "  Practice daily  ",
      completionXp: 20,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("Learn piano");
      expect(parsed.data.description).toBe("Practice daily");
    }

    expect(progressionGoalCreateBodySchema.safeParse({ title: " " }).success).toBe(false);
  });

  it("rejects negative XP for goals and recurring actions", () => {
    expect(
      progressionGoalCreateBodySchema.safeParse({
        title: "Read",
        completionXp: -1,
      }).success,
    ).toBe(false);

    expect(
      progressionRecurringActionInputSchema.safeParse({
        title: "Read chapter",
        frequencyType: "daily",
        frequencyConfig: {},
        xpPerCheckin: -1,
      }).success,
    ).toBe(false);
  });

  it("validates frequency configs", () => {
    expect(
      progressionRecurringActionInputSchema.safeParse({
        title: "Run",
        frequencyType: "specific_weekdays",
        frequencyConfig: { weekdays: [1, 3, 7] },
        xpPerCheckin: 2,
      }).success,
    ).toBe(true);

    expect(
      progressionRecurringActionInputSchema.safeParse({
        title: "Run",
        frequencyType: "specific_weekdays",
        frequencyConfig: { weekdays: [0, 8] },
        xpPerCheckin: 2,
      }).success,
    ).toBe(false);

    expect(
      progressionRecurringActionInputSchema.safeParse({
        title: "Gym",
        frequencyType: "weekly_count",
        frequencyConfig: { targetCount: 3 },
        xpPerCheckin: 5,
      }).success,
    ).toBe(true);
  });

  it("validates UUIDs and lifecycle operations", () => {
    expect(
      progressionCheckinCreateBodySchema.safeParse({ actionId }).success,
    ).toBe(true);
    expect(
      progressionCheckinCreateBodySchema.safeParse({ actionId: "nope" }).success,
    ).toBe(false);

    expect(
      progressionGoalOperationBodySchema.safeParse({
        goalId,
        operation: "complete",
      }).success,
    ).toBe(true);
    expect(
      progressionGoalOperationBodySchema.safeParse({
        goalId,
        operation: "reopen",
      }).success,
    ).toBe(false);
  });

  it("validates update and deadline review payloads", () => {
    expect(
      progressionGoalUpdateBodySchema.safeParse({
        id: goalId,
        title: "Updated",
        status: "completed",
      }).success,
    ).toBe(false);

    expect(
      progressionDeadlineReviewBodySchema.safeParse({
        goalId,
        action: "postpone",
        newDeadline: "2026-05-10",
      }).success,
    ).toBe(true);

    expect(
      progressionDeadlineReviewBodySchema.safeParse({
        goalId,
        action: "postpone",
      }).success,
    ).toBe(false);
  });
});
