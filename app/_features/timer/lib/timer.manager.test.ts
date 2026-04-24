// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockOscillator {
  frequency = {
    setValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn(() => new MockOscillator());
  createGain = vi.fn(() => new MockGainNode());
}

describe("timer manager", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });

    vi.stubGlobal("window", {
      AudioContext: MockAudioContext,
      webkitAudioContext: undefined,
    });
  });

  afterEach(async () => {
    const timerModule = await import("./timer.manager");
    const active = timerModule.timerManager.getActiveTimer();
    if (active) {
      timerModule.timerManager.stopTimer(active.id);
    }
    timerModule.timerManager.stopNotificationSound();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts a timer, notifies subscribers, pauses, resumes and expires", async () => {
    const { timerManager } = await import("./timer.manager");
    const listener = vi.fn();
    const unsubscribe = timerManager.subscribe(listener);

    const timerId = timerManager.startTimer(1);
    expect(timerId).toMatch(/^timer-/);
    expect(timerManager.getActiveTimer()).toMatchObject({
      id: timerId,
      isActive: true,
      remainingSeconds: 1,
    });

    expect(timerManager.pauseTimer(timerId)).toBe(true);
    expect(timerManager.getActiveTimer()).toMatchObject({
      isPaused: true,
    });
    expect(timerManager.resumeTimer(timerId)).toBe(true);
    expect(timerManager.getActiveTimer()).toMatchObject({
      isPaused: false,
    });

    await vi.advanceTimersByTimeAsync(1200);

    expect(timerManager.getActiveTimer()).toMatchObject({
      id: timerId,
      isActive: false,
      isExpired: true,
      remainingSeconds: 0,
    });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("stops active timers and returns false for missing timers", async () => {
    const { timerManager } = await import("./timer.manager");

    const timerId = timerManager.startTimer(10);
    expect(timerManager.stopTimer(timerId)).toBe(true);
    expect(timerManager.getActiveTimer()).toBeNull();
    expect(timerManager.stopTimer("missing")).toBe(false);
  });

  it("returns false when pause/resume are not allowed and stops notification sound safely", async () => {
    const { timerManager } = await import("./timer.manager");

    expect(timerManager.pauseTimer("missing")).toBe(false);
    expect(timerManager.resumeTimer("missing")).toBe(false);

    const timerId = timerManager.startTimer(1);
    await vi.advanceTimersByTimeAsync(1200);

    expect(timerManager.pauseTimer(timerId)).toBe(false);
    expect(timerManager.resumeTimer(timerId)).toBe(false);
    expect(() => timerManager.stopNotificationSound()).not.toThrow();
  });

  it("replaces previous timers when starting a new one", async () => {
    const { timerManager } = await import("./timer.manager");

    const firstId = timerManager.startTimer(30);
    vi.setSystemTime(new Date(Date.now() + 1));
    const secondId = timerManager.startTimer(60);

    expect(firstId).not.toBe(secondId);
    expect(timerManager.getActiveTimer()).toMatchObject({
      id: secondId,
      durationSeconds: 60,
    });
  });
});
