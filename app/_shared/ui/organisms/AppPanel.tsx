import type { HTMLAttributes, ReactNode } from "react";
import { Surface, type SurfaceVariant } from "../atoms";

export type AppPanelElement = "div" | "section" | "aside";

export interface AppPanelProps extends HTMLAttributes<HTMLElement> {
  as?: AppPanelElement;
  children: ReactNode;
  className?: string;
  variant?: SurfaceVariant;
}

export function AppPanel({
  as,
  children,
  className = "",
  variant = "outlined",
  ...props
}: AppPanelProps) {
  return (
    <Surface
      as={as}
      className={["p-6", className].join(" ").trim()}
      variant={variant}
      {...props}
    >
      {children}
    </Surface>
  );
}
