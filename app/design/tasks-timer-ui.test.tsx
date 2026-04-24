// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { TimerState } from "@/app/_features/timer/lib/timer.manager";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodoPanel } from "@/app/design/organisms/tasks/TodoPanel";
import { useTodoPanelLayout } from "@/app/design/organisms/tasks/useTodoPanelLayout";
import { TimerPanel } from "@/app/design/organisms/timer/TimerPanel";
import { useSmoothTimer } from "@/app/design/organisms/timer/useSmoothTimer";

const tasksTimerMocks = vi.hoisted(() => ({
  tasksState: {
    remove: vi.fn(),
    todos: [] as Array<{ id: string; text: string; completed: boolean }>,
    update: vi.fn(),
  },
  timerState: {
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    stopNotificationSound: vi.fn(),
    timer: null as TimerState | null,
  },
}));

vi.mock("@/app/_features/tasks/state/tasks.store", () => ({
  useTasksStore: (
    selector: (state: typeof tasksTimerMocks.tasksState) => unknown,
  ) => selector(tasksTimerMocks.tasksState),
}));

vi.mock("@/app/_features/timer/state/timer.store", () => ({
  useTimerStore: (
    selector: (state: typeof tasksTimerMocks.timerState) => unknown,
  ) => selector(tasksTimerMocks.timerState),
}));

describe("tasks and timer design", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00+01:00"));
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0)),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => window.clearTimeout(frameId)),
    );

    tasksTimerMocks.tasksState.remove.mockReset();
    tasksTimerMocks.tasksState.update.mockReset();
    tasksTimerMocks.timerState.pause.mockReset();
    tasksTimerMocks.timerState.resume.mockReset();
    tasksTimerMocks.timerState.stop.mockReset();
    tasksTimerMocks.timerState.stopNotificationSound.mockReset();

    tasksTimerMocks.tasksState.todos = [
      { id: "todo-1", text: "Preparare la demo", completed: false },
      { id: "todo-2", text: "Inviare il report", completed: true },
    ];

    tasksTimerMocks.timerState.timer = {
      id: "timer-1",
      durationSeconds: 90,
      remainingSeconds: 45,
      remainingMilliseconds: 50,
      startTime: Date.now() - 45_000,
      isActive: true,
      isExpired: false,
      isPaused: false,
      pausedAt: null,
      pausedElapsed: 0,
    };
  });

  it("computes the todo panel layout based on whether the timer is visible", () => {
    const withTimer = renderHook(() => useTodoPanelLayout(true));
    const withoutTimer = renderHook(() => useTodoPanelLayout(false));

    expect(withTimer.result.current).toEqual({
      topOffset: "calc(6rem + 48px)",
      maxHeight: "calc(100vh - 144px - 244px - 80px)",
    });

    expect(withoutTimer.result.current).toEqual({
      topOffset: "24px",
      maxHeight: "calc(100vh - 24px - 244px - 80px)",
    });
  });

  it("renders todos, toggles completion state and deletes items", () => {
    render(<TodoPanel />);

    expect(screen.getByText("Cose da fare")).toBeInTheDocument();
    expect(screen.getByText("Preparare la demo")).toBeInTheDocument();
    expect(screen.getByText("Inviare il report")).toBeInTheDocument();
    expect(screen.getByText("1 da fare • 1 completato")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Segna come completato"));
    expect(tasksTimerMocks.tasksState.update).toHaveBeenCalledWith("todo-1", {
      completed: true,
    });

    fireEvent.click(screen.getByLabelText("Segna come non completato"));
    expect(tasksTimerMocks.tasksState.update).toHaveBeenCalledWith("todo-2", {
      completed: false,
    });

    fireEvent.click(screen.getAllByLabelText("Elimina todo")[0] as HTMLElement);
    expect(tasksTimerMocks.tasksState.remove).toHaveBeenCalledWith("todo-1");
  });

  it("renders nothing when there are no todos", () => {
    tasksTimerMocks.tasksState.todos = [];
    const { container } = render(<TodoPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("returns static values for paused or expired timers and animates active ones", async () => {
    const pausedTimer: TimerState = {
      ...tasksTimerMocks.timerState.timer!,
      isPaused: true,
      remainingSeconds: 12,
      remainingMilliseconds: 34,
    };

    expect(renderHook(() => useSmoothTimer(null)).result.current).toBeNull();
    expect(renderHook(() => useSmoothTimer(pausedTimer)).result.current).toEqual({
      seconds: 12,
      milliseconds: 34,
    });

    expect(
      renderHook(() =>
        useSmoothTimer({
          ...pausedTimer,
          isPaused: false,
          isExpired: true,
        }),
      ).result.current,
    ).toEqual({
      seconds: 0,
      milliseconds: 0,
    });

    const runningTimer: TimerState = {
      ...tasksTimerMocks.timerState.timer!,
      durationSeconds: 5,
      remainingSeconds: 5,
      remainingMilliseconds: 0,
      startTime: Date.now(),
    };

    const { result } = renderHook(() => useSmoothTimer(runningTimer));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current).not.toBeNull();
    expect(result.current?.seconds).toBeLessThanOrEqual(4);
  });

  it("cancels scheduled frames when the timer stops mid-animation and when it expires", () => {
    let scheduledFrame: FrameRequestCallback | null = null;

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        scheduledFrame = callback;
        return 99;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const runningTimer: TimerState = {
      ...tasksTimerMocks.timerState.timer!,
      durationSeconds: 1,
      remainingSeconds: 1,
      remainingMilliseconds: 0,
      startTime: Date.now(),
      isPaused: false,
      isExpired: false,
    };

    renderHook(() => useSmoothTimer(runningTimer));

    runningTimer.isPaused = true;
    act(() => {
      scheduledFrame?.(0);
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(99);

    runningTimer.isPaused = false;
    runningTimer.startTime = Date.now() - 1_000;

    act(() => {
      scheduledFrame?.(0);
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(99);
  });

  it("renders the timer panel and delegates pause/resume/stop actions", () => {
    const { rerender } = render(<TimerPanel />);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Metti in pausa timer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Metti in pausa timer" }));
    expect(tasksTimerMocks.timerState.pause).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Ferma timer" }));
    expect(tasksTimerMocks.timerState.stop).toHaveBeenCalledOnce();
    expect(tasksTimerMocks.timerState.stopNotificationSound).toHaveBeenCalledOnce();

    tasksTimerMocks.timerState.timer = {
      ...tasksTimerMocks.timerState.timer!,
      isPaused: true,
      remainingSeconds: 30,
      remainingMilliseconds: 25,
    };

    rerender(<TimerPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Riprendi timer" }));
    expect(tasksTimerMocks.timerState.resume).toHaveBeenCalledOnce();

    tasksTimerMocks.timerState.timer = {
      ...tasksTimerMocks.timerState.timer!,
      isExpired: true,
      isPaused: false,
      remainingSeconds: 0,
      remainingMilliseconds: 0,
    };

    rerender(<TimerPanel />);
    expect(screen.getByText("Timer scaduto!")).toBeInTheDocument();
  });

  it("renders nothing when there is no active timer", () => {
    tasksTimerMocks.timerState.timer = null;
    const { container } = render(<TimerPanel />);

    expect(container).toBeEmptyDOMElement();
  });
});
