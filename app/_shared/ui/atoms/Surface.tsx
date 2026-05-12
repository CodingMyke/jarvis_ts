import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type SurfaceVariant = "flat" | "outlined" | "overlay";

export interface SurfaceProps<T extends ElementType = "div"> {
  as?: T;
  children: ReactNode;
  className?: string;
  variant?: SurfaceVariant;
}

const variantClassNames: Record<SurfaceVariant, string> = {
  flat: "rounded-app border border-transparent bg-surface",
  outlined: "rounded-app border border-line bg-surface",
  overlay: "rounded-app border border-line bg-overlay shadow-overlay backdrop-blur-xl",
};

export function Surface<T extends ElementType = "div">({
  as,
  children,
  className = "",
  variant = "outlined",
  ...props
}: SurfaceProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof SurfaceProps<T>>) {
  const Component = as ?? "div";

  return (
    <Component className={[variantClassNames[variant], className].join(" ").trim()} {...props}>
      {children}
    </Component>
  );
}
