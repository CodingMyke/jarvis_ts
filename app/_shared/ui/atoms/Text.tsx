import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type TextTone = "default" | "muted" | "danger";

export interface TextProps<T extends ElementType = "p"> {
  as?: T;
  children: ReactNode;
  tone?: TextTone;
  className?: string;
}

export function Text<T extends ElementType = "p">({
  as,
  children,
  className = "",
  tone = "default",
  ...props
}: TextProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof TextProps<T>>) {
  const Component = as ?? "p";
  const toneClassName =
    tone === "muted" ? "ui-text-muted" : tone === "danger" ? "text-red-400" : "text-foreground";

  return (
    <Component className={[toneClassName, className].join(" ").trim()} {...props}>
      {children}
    </Component>
  );
}
