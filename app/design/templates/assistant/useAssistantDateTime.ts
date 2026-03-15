"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";

export function useAssistantDateTime(): {
  date: string;
  dateRef: RefObject<HTMLSpanElement | null>;
  day: string;
  dayRef: RefObject<HTMLSpanElement | null>;
  time: string;
  timeRef: RefObject<HTMLSpanElement | null>;
} {
  const timeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef<HTMLSpanElement>(null);
  const lastMinuteRef = useRef<number>(-1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();

      if (timeRef.current) {
        timeRef.current.textContent = now.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      if (currentMinute !== lastMinuteRef.current) {
        lastMinuteRef.current = currentMinute;

        if (dayRef.current) {
          const day = now.toLocaleDateString("it-IT", { weekday: "long" });
          dayRef.current.textContent = day.charAt(0).toUpperCase() + day.slice(1);
        }

        if (dateRef.current) {
          dateRef.current.textContent = now.toLocaleDateString("it-IT", {
            day: "numeric",
            month: "long",
          });
        }
      }
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const initialNow = useMemo(() => new Date(), []);
  const day = useMemo(() => {
    const value = initialNow.toLocaleDateString("it-IT", { weekday: "long" });
    return value.charAt(0).toUpperCase() + value.slice(1);
  }, [initialNow]);
  const date = useMemo(
    () => initialNow.toLocaleDateString("it-IT", { day: "numeric", month: "long" }),
    [initialNow],
  );
  const time = useMemo(
    () => initialNow.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    [initialNow],
  );

  return {
    date,
    dateRef,
    day,
    dayRef,
    time,
    timeRef,
  };
}
