import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export interface HeadingProps<T extends ElementType = "h2"> {
  as?: T;
  children: ReactNode;
  className?: string;
}

export function Heading<T extends ElementType = "h2">({
  as,
  children,
  className = "",
  ...props
}: HeadingProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof HeadingProps<T>>) {
  const Component = as ?? "h2";

  return (
    <Component className={["font-medium text-foreground", className].join(" ").trim()} {...props}>
      {children}
    </Component>
  );
}
