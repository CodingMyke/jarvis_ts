// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressionTodayPanel } from "./ProgressionTodayPanel";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  createProgressionCheckin: vi.fn(),
  undoProgressionCheckin: vi.fn(),
}));

vi.mock("@/app/_features/progression/server/progression-dates", () => ({
  getMillisecondsUntilNextLocalMidnight: vi.fn(() => 25),
}));

describe("ProgressionTodayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes the page again at the next local midnight", async () => {
    vi.useFakeTimers();

    render(
      <ProgressionTodayPanel
        initialTodayItems={[]}
        initialWeeklyItems={[]}
        timezone="Europe/Rome"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(25);
      await Promise.resolve();
    });

    expect(navigationMocks.refresh).toHaveBeenCalled();
  });
});
