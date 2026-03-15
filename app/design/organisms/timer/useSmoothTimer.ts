"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TimerDisplayTime } from "@/app/_features/timer/lib/timer-display";
import type { TimerState } from "@/app/_features/timer/lib/timer.manager";

export function useSmoothTimer(timer: TimerState | null): TimerDisplayTime | null {
  const staticTime = useMemo(() => {
    if (!timer) {
      return null;
    }

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

  const [displayTime, setDisplayTime] = useState<TimerDisplayTime | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef(timer);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

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

      setDisplayTime((previous) => {
        if (
          previous
          && previous.seconds === seconds
          && previous.milliseconds === milliseconds
        ) {
          return previous;
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
  }, [timer]);

  return staticTime ?? displayTime;
}
