import type { RefObject } from "react";

interface AssistantClockProps {
  day: string;
  date: string;
  time: string;
  timeRef: RefObject<HTMLSpanElement | null>;
  dayRef: RefObject<HTMLSpanElement | null>;
  dateRef: RefObject<HTMLSpanElement | null>;
}

export function AssistantClock({
  day,
  date,
  time,
  timeRef,
  dayRef,
  dateRef,
}: AssistantClockProps) {
  return (
    <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center">
      <span ref={timeRef} className="text-7xl font-semibold text-foreground">
        {time}
      </span>
      <span className="text-3xl text-muted">
        <span ref={dayRef}>{day}</span>, <span ref={dateRef}>{date}</span>
      </span>
    </div>
  );
}
