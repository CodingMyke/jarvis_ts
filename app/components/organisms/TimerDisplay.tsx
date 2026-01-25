"use client";

import { useTimer } from "./TimerContext";

/**
 * Formatta il tempo rimanente in formato MM:SS:CC (minuti:secondi:centesimi).
 */
function formatTime(seconds: number, milliseconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${milliseconds.toString().padStart(2, "0")}`;
}

/**
 * Componente per mostrare il timer attivo in alto a destra.
 */
export function TimerDisplay() {
  const { timer, stopTimer, stopNotificationSound } = useTimer();

  if (!timer) {
    return null;
  }

  const handleStop = () => {
    stopTimer();
    stopNotificationSound();
  };

  const percentage = timer.isExpired
    ? 0
    : (timer.remainingSeconds / timer.durationSeconds) * 100;

  return (
    <div className="glass absolute right-6 top-6 z-10 rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        {/* Icona timer */}
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

        {/* Tempo rimanente */}
        <div className="flex min-w-[140px] flex-col">
          <span
            className={`text-3xl font-semibold tabular-nums ${
              timer.isExpired ? "text-red-400" : "text-foreground"
            }`}
          >
            {formatTime(timer.remainingSeconds, timer.remainingMilliseconds)}
          </span>
          {/* Barra di progresso */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-all duration-100 ${
                timer.isExpired ? "bg-red-500" : "bg-accent"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Pulsante stop */}
        <button
          onClick={handleStop}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-white/20 hover:text-foreground"
          aria-label="Ferma timer"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Indicatore quando il timer è scaduto */}
      {timer.isExpired && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-red-400">
          <span className="animate-pulse">🔔</span>
          <span>Timer scaduto!</span>
        </div>
      )}
    </div>
  );
}
