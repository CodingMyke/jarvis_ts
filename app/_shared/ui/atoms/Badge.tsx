import type { ReactNode } from "react";

export type BadgeVariant = "muted" | "accent" | "warning" | "danger";

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: BadgeVariant;
}

const variantClassNames: Record<BadgeVariant, string> = {
  muted: "border-line bg-surface text-copy-muted",
  accent: "border-line-accent bg-accent-tint text-accent",
  warning: "border-line-warning bg-warning-tint text-warning",
  danger: "border-line-danger bg-danger-tint text-danger",
};

export function Badge({
  children,
  className = "",
  variant = "muted",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-app border px-2 py-1 text-xs leading-4",
        variantClassNames[variant],
        className,
      ].join(" ").trim()}
    >
      {children}
    </span>
  );
}
