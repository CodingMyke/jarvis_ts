import type { TimerState } from "@/app/_features/timer/lib/timer.manager";

export interface TimerDisplayTime {
  seconds: number;
  milliseconds: number;
}

export function formatTimerDisplay(seconds: number, milliseconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}:${milliseconds.toString().padStart(2, "0")}`;
}

export function calculateTimerProgress(
  timer: TimerState,
  displayTime: TimerDisplayTime,
): number {
  if (timer.isExpired || timer.durationSeconds <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (displayTime.seconds / timer.durationSeconds) * 100));
}
