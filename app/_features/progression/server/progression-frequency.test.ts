import { describe, expect, it } from "vitest";
import {
  isActionDueToday,
  isWeeklyCountAvailable,
  parseFrequencyConfig,
  type ProgressionFrequencyAction,
  type ProgressionTodayContext,
} from "./progression-frequency";

const todayContext: ProgressionTodayContext = {
  todayLocalDate: "2026-04-29",
  isoWeekday: 3,
  weekStart: "2026-04-27",
  weekEnd: "2026-05-03",
};

function makeAction(
  overrides: Partial<ProgressionFrequencyAction>,
): ProgressionFrequencyAction {
  return {
    id: "action-1",
    frequencyType: "daily",
    frequencyConfig: {},
    active: true,
    ...overrides,
  };
}

describe("progression frequency", () => {
  it("parses daily, specific weekdays, and weekly-count configs", () => {
    expect(parseFrequencyConfig("daily", {})).toEqual({});
    expect(parseFrequencyConfig("specific_weekdays", { weekdays: [1, 3, 5] })).toEqual({
      weekdays: [1, 3, 5],
    });
    expect(parseFrequencyConfig("weekly_count", { targetCount: 3 })).toEqual({
      targetCount: 3,
    });
  });

  it("marks daily actions due every day", () => {
    expect(isActionDueToday(makeAction({ frequencyType: "daily" }), todayContext)).toBe(true);
  });

  it("marks specific weekday actions due only on configured ISO weekdays", () => {
    expect(
      isActionDueToday(
        makeAction({
          frequencyType: "specific_weekdays",
          frequencyConfig: { weekdays: [1, 3] },
        }),
        todayContext,
      ),
    ).toBe(true);

    expect(
      isActionDueToday(
        makeAction({
          frequencyType: "specific_weekdays",
          frequencyConfig: { weekdays: [2, 4] },
        }),
        todayContext,
      ),
    ).toBe(false);
  });

  it("keeps weekly-count actions available until the target is reached", () => {
    const action = makeAction({
      frequencyType: "weekly_count",
      frequencyConfig: { targetCount: 3 },
    });

    expect(
      isWeeklyCountAvailable(action, [
        { actionId: action.id, localDate: "2026-04-27" },
        { actionId: action.id, localDate: "2026-04-28" },
      ]),
    ).toBe(true);

    expect(
      isWeeklyCountAvailable(action, [
        { actionId: action.id, localDate: "2026-04-27" },
        { actionId: action.id, localDate: "2026-04-28" },
        { actionId: action.id, localDate: "2026-04-29" },
      ]),
    ).toBe(false);
  });

  it("prevents inactive actions from being due", () => {
    expect(isActionDueToday(makeAction({ active: false }), todayContext)).toBe(false);
  });
});
