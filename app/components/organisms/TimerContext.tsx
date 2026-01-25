"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { timerManager, type TimerState } from "@/app/lib/timer";

interface TimerContextValue {
  timer: TimerState | null;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopNotificationSound: () => void;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    const unsubscribe = timerManager.subscribe((state) => {
      setTimer(state);
    });

    return unsubscribe;
  }, []);

  const stopTimer = useCallback(() => {
    if (timer) {
      timerManager.stopTimer(timer.id);
    }
  }, [timer]);

  const pauseTimer = useCallback(() => {
    if (timer && !timer.isPaused && !timer.isExpired) {
      timerManager.pauseTimer(timer.id);
    }
  }, [timer]);

  const resumeTimer = useCallback(() => {
    if (timer && timer.isPaused && !timer.isExpired) {
      timerManager.resumeTimer(timer.id);
    }
  }, [timer]);

  const stopNotificationSound = useCallback(() => {
    timerManager.stopNotificationSound();
  }, []);

  return (
    <TimerContext.Provider value={{ timer, stopTimer, pauseTimer, resumeTimer, stopNotificationSound }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
