import { StopIcon } from "@/app/design/atoms/shared";
import type { TimerState } from "@/app/_features/timer/lib/timer.manager";

interface TimerControlsProps {
  timer: TimerState;
  onPauseResume: () => void;
  onStop: () => void;
}

export function TimerControls({
  timer,
  onPauseResume,
  onStop,
}: TimerControlsProps) {
  return (
    <>
      {!timer.isExpired ? (
        <button
          onClick={onPauseResume}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 ${
            timer.isPaused
              ? "text-yellow-400 hover:text-yellow-300"
              : "text-muted hover:text-foreground"
          }`}
          aria-label={timer.isPaused ? "Riprendi timer" : "Metti in pausa timer"}
        >
          {timer.isPaused ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </button>
      ) : null}

      <button
        onClick={onStop}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-white/20 hover:text-foreground"
        aria-label="Ferma timer"
      >
        <StopIcon className="h-4 w-4" />
      </button>
    </>
  );
}
