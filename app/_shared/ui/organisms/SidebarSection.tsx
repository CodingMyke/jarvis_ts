import type { ReactNode } from "react";

export interface SidebarSectionProps {
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ children, className = "" }: SidebarSectionProps) {
  return <div className={["border-b border-line p-4", className].join(" ").trim()}>{children}</div>;
}
