import { useEffect, useState } from "react";

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

export function useDateTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return { day: "", date: "", time: "" };

  const day = now.toLocaleDateString("it-IT", { weekday: "long" });
  const date = now.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return { day: day.charAt(0).toUpperCase() + day.slice(1), date, time };
}
