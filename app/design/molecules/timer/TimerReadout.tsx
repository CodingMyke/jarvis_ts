import { calculateTimerProgress, formatTimerDisplay, type TimerDisplayTime } from "@/app/_features/timer/lib/timer-display";
import type { TimerState } from "@/app/_features/timer/lib/timer.manager";

interface TimerReadoutProps {
  timer: TimerState;
  displayTime: TimerDisplayTime;
}

export function TimerReadout({
  timer,
  displayTime,
}: TimerReadoutProps) {
  const percentage = calculateTimerProgress(timer, displayTime);

  return (
    <div className="flex min-w-[140px] flex-col">
      <span
        className={`text-3xl font-semibold tabular-nums ${
          timer.isExpired
            ? "text-red-400"
            : timer.isPaused
              ? "text-yellow-400"
              : "text-foreground"
        }`}
      >
        {formatTimerDisplay(displayTime.seconds, displayTime.milliseconds)}
      </span>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-[width,background-color] duration-100 ${
            timer.isExpired ? "bg-red-500" : "bg-accent"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
