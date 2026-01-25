import { useEffect, useRef, useMemo } from "react";

export function useOrbState(listeningMode: string) {
  switch (listeningMode) {
    case "connected":
      return "speaking" as const;
    case "wake_word":
      return "listening" as const;
    default:
      return "idle" as const;
  }
}

/**
 * Hook ottimizzato per data/ora che aggiorna direttamente il DOM
 * invece di causare re-render ogni secondo.
 */
export function useDateTime() {
  const timeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef<HTMLSpanElement>(null);
  const lastMinuteRef = useRef<number>(-1);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentMinute = now.getMinutes();

      // Aggiorna sempre l'ora (può cambiare ogni secondo)
      if (timeRef.current) {
        timeRef.current.textContent = now.toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Aggiorna giorno/data solo quando cambia il minuto (per evitare calcoli inutili)
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

    // Aggiorna immediatamente
    updateTime();

    // Aggiorna ogni secondo
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Valori iniziali per SSR/hydration
  const initialNow = useMemo(() => new Date(), []);
  const initialDay = useMemo(
    () => {
      const day = initialNow.toLocaleDateString("it-IT", { weekday: "long" });
      return day.charAt(0).toUpperCase() + day.slice(1);
    },
    [initialNow]
  );
  const initialDate = useMemo(
    () => initialNow.toLocaleDateString("it-IT", { day: "numeric", month: "long" }),
    [initialNow]
  );
  const initialTime = useMemo(
    () => initialNow.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    [initialNow]
  );

  return {
    day: initialDay,
    date: initialDate,
    time: initialTime,
    refs: {
      timeRef,
      dateRef,
      dayRef,
    },
  };
}
