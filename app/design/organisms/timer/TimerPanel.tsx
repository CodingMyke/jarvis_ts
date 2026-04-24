"use client";

import { TimerControls } from "@/app/design/molecules/timer/TimerControls";
import { TimerReadout } from "@/app/design/molecules/timer/TimerReadout";
import { useTimerStore } from "@/app/_features/timer/state/timer.store";
import { useSmoothTimer } from "./useSmoothTimer";

export function TimerPanel() {
  const timer = useTimerStore((state) => state.timer);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const stop = useTimerStore((state) => state.stop);
  const stopNotificationSound = useTimerStore((state) => state.stopNotificationSound);
  const smoothTime = useSmoothTimer(timer);

  const displayTime = timer?.isPaused
    ? {
        seconds: timer.remainingSeconds,
        milliseconds: timer.remainingMilliseconds,
      }
    : smoothTime;

  if (!timer || !displayTime) {
    return null;
  }

  return (
    <div className="glass absolute right-6 top-6 z-10 rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 text-accent ${timer.isExpired ? "animate-pulse" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <TimerReadout timer={timer} displayTime={displayTime} />

        <TimerControls
          timer={timer}
          onPauseResume={() => {
            if (timer.isPaused) {
              resume();
              return;
            }

            pause();
          }}
          onStop={() => {
            stop();
            stopNotificationSound();
          }}
        />
      </div>

      {timer.isExpired ? (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-red-400">
          <span className="animate-pulse">🔔</span>
          <span>Timer scaduto!</span>
        </div>
      ) : null}
    </div>
  );
}
