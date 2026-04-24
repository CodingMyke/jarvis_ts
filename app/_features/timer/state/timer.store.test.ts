// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";
import { timerManager, type TimerState } from "@/app/_features/timer/lib/timer.manager";
import { calculateTimerProgress, formatTimerDisplay } from "@/app/_features/timer/lib/timer-display";
import { ensureTimerStoreSubscription, useTimerStore } from "./timer.store";

vi.mock("@/app/_features/timer/lib/timer.manager", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/timer/lib/timer.manager")>(
    "@/app/_features/timer/lib/timer.manager",
  );

  return {
    ...actual,
    timerManager: {
      subscribe: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      stopTimer: vi.fn(),
      stopNotificationSound: vi.fn(),
    },
  };
});

function createTimer(overrides: Partial<TimerState> = {}): TimerState {
  return {
    id: "timer-1",
    durationSeconds: 120,
    remainingSeconds: 90,
    remainingMilliseconds: 50,
    startTime: 1,
    isActive: true,
    isExpired: false,
    isPaused: false,
    pausedAt: null,
    pausedElapsed: 0,
    ...overrides,
  };
}

describe("timer store", () => {
  beforeEach(() => {
    useTimerStore.setState({
      timer: null,
    });
    vi.clearAllMocks();
  });

  it("subscribes to the timer manager and stores the latest timer", () => {
    const subscribeMock = vi.mocked(timerManager.subscribe);
    subscribeMock.mockImplementation((listener) => {
      listener(createTimer());
      return () => undefined;
    });

    ensureTimerStoreSubscription();

    expect(subscribeMock).toHaveBeenCalledOnce();
    expect(useTimerStore.getState().timer).toMatchObject({ id: "timer-1" });
  });

  it("delegates pause, resume and stop actions to the timer manager", () => {
    useTimerStore.setState({
      timer: createTimer(),
    });

    useTimerStore.getState().pause();
    useTimerStore.setState({
      timer: createTimer({ isPaused: true }),
    });
    useTimerStore.getState().resume();
    useTimerStore.getState().stop();
    useTimerStore.getState().stopNotificationSound();

    expect(timerManager.pauseTimer).toHaveBeenCalledWith("timer-1");
    expect(timerManager.resumeTimer).toHaveBeenCalledWith("timer-1");
    expect(timerManager.stopTimer).toHaveBeenCalledWith("timer-1");
    expect(timerManager.stopNotificationSound).toHaveBeenCalledOnce();
  });

  it("formats and computes timer display helpers", () => {
    expect(formatTimerDisplay(65, 4)).toBe("01:05:04");
    expect(
      calculateTimerProgress(createTimer({ durationSeconds: 100 }), {
        seconds: 25,
        milliseconds: 0,
      }),
    ).toBe(25);
  });
});
