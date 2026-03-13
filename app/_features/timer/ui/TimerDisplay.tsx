"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
 * Hook per calcolare il tempo rimanente in modo fluido usando requestAnimationFrame.
 * Quando il timer è in pausa o expired, usa i valori direttamente dal timer.
 */
function useSmoothTimer(timer: { startTime: number; durationSeconds: number; remainingSeconds: number; remainingMilliseconds: number; isExpired: boolean; isPaused: boolean; pausedElapsed: number } | null) {
  // Calcola il valore statico quando il timer è expired o in pausa
  const staticTime = useMemo(() => {
    if (!timer) return null;
    if (timer.isExpired) {
      return { seconds: 0, milliseconds: 0 };
    }
    if (timer.isPaused) {
      return {
        seconds: timer.remainingSeconds,
        milliseconds: timer.remainingMilliseconds,
      };
    }
    return null;
  }, [timer]);

  const [displayTime, setDisplayTime] = useState<{ seconds: number; milliseconds: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef(timer);

  // Aggiorna il ref quando il timer cambia
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Gestisce l'animazione solo quando il timer è attivo e non in pausa
  useEffect(() => {
    if (!timer || timer.isExpired || timer.isPaused) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const updateTime = () => {
      const currentTimer = timerRef.current;
      if (!currentTimer || currentTimer.isExpired || currentTimer.isPaused) {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        return;
      }

      const elapsed = Date.now() - currentTimer.startTime - currentTimer.pausedElapsed;
      const remainingTotal = Math.max(0, currentTimer.durationSeconds * 1000 - elapsed);
      const seconds = Math.floor(remainingTotal / 1000);
      const milliseconds = Math.floor((remainingTotal % 1000) / 10);

      // Evita setState se il valore non è cambiato (ottimizzazione)
      setDisplayTime((prev) => {
        if (prev && prev.seconds === seconds && prev.milliseconds === milliseconds) {
          return prev;
        }
        return { seconds, milliseconds };
      });

      if (remainingTotal > 0) {
        frameRef.current = requestAnimationFrame(updateTime);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [timer, timer?.startTime, timer?.durationSeconds, timer?.isExpired, timer?.isPaused, timer?.pausedElapsed]);

  // Restituisce il valore statico se disponibile, altrimenti il valore animato
  return staticTime !== null ? staticTime : displayTime;
}

/**
 * Componente per mostrare il timer attivo in alto a destra.
 */
export function TimerDisplay() {
  const { timer, stopTimer, pauseTimer, resumeTimer, stopNotificationSound } = useTimer();
  const smoothTime = useSmoothTimer(timer);

  // Quando è in pausa, usa i valori direttamente dal timer
  const displayTime = timer?.isPaused 
    ? { seconds: timer.remainingSeconds, milliseconds: timer.remainingMilliseconds }
    : smoothTime;

  if (!timer || !displayTime) {
    return null;
  }

  const handleStop = () => {
    stopTimer();
    stopNotificationSound();
  };

  const handlePauseResume = () => {
    if (timer.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  const percentage = timer.isExpired
    ? 0
    : timer.durationSeconds > 0
    ? Math.max(0, Math.min(100, (displayTime.seconds / timer.durationSeconds) * 100))
    : 0;

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
              timer.isExpired ? "text-red-400" : timer.isPaused ? "text-yellow-400" : "text-foreground"
            }`}
          >
            {formatTime(displayTime.seconds, displayTime.milliseconds)}
          </span>
          {/* Barra di progresso */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full transition-[width,background-color] duration-100 ${
                timer.isExpired ? "bg-red-500" : "bg-accent"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Pulsante pausa/ripresa */}
        {!timer.isExpired && (
          <button
            onClick={handlePauseResume}
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
        )}

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
