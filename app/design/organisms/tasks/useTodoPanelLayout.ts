import { useMemo } from "react";

export function useTodoPanelLayout(hasTimer: boolean): {
  topOffset: string;
  maxHeight: string;
} {
  return useMemo(() => {
    const topOffset = hasTimer ? "calc(6rem + 48px)" : "24px";
    const topOffsetValue = hasTimer ? 144 : 24;

    return {
      topOffset,
      maxHeight: `calc(100vh - ${topOffsetValue}px - 244px - 80px)`,
    };
  }, [hasTimer]);
}
