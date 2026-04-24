interface EventDotProps {
  color?: string;
  isExpanded: boolean;
}

export function EventDot({ color, isExpanded }: EventDotProps) {
  return (
    <div
      className={`shrink-0 rounded-full transition-[width,height,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth) ${
        isExpanded ? "h-3 w-3" : "h-2 w-2"
      }`}
      style={{ backgroundColor: color || "var(--accent)" }}
    />
  );
}
