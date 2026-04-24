"use client";

import { create } from "zustand";
import { timerManager, type TimerState } from "@/app/_features/timer/lib/timer.manager";

interface TimerStoreState {
  timer: TimerState | null;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  stopNotificationSound: () => void;
}

let timerStoreSubscribed = false;

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  timer: null,
  pause: () => {
    const timer = get().timer;

    if (timer && !timer.isPaused && !timer.isExpired) {
      timerManager.pauseTimer(timer.id);
    }
  },
  resume: () => {
    const timer = get().timer;

    if (timer && timer.isPaused && !timer.isExpired) {
      timerManager.resumeTimer(timer.id);
    }
  },
  stop: () => {
    const timer = get().timer;

    if (timer) {
      timerManager.stopTimer(timer.id);
    }
  },
  stopNotificationSound: () => {
    timerManager.stopNotificationSound();
  },
}));

export function ensureTimerStoreSubscription(): void {
  if (timerStoreSubscribed) {
    return;
  }

  timerStoreSubscribed = true;
  timerManager.subscribe((timer) => {
    useTimerStore.setState((state) => ({
      ...state,
      timer,
    }));
  });
}
