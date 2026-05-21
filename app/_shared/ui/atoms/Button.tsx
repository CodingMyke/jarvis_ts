import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "recording" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "border-line-accent bg-accent-tint text-accent hover:bg-accent hover:text-app",
  secondary: "border-line bg-surface text-copy-muted hover:bg-interactive hover:text-copy",
  recording: "border-accent bg-accent-tint text-accent shadow-glow hover:bg-accent hover:text-app",
  ghost: "border-transparent bg-transparent text-copy-muted hover:bg-interactive hover:text-copy",
  danger: "border-line-danger bg-danger-tint text-danger hover:bg-danger hover:text-app",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-10 px-3.5 py-2.5 text-sm",
  icon: "h-9 w-9 px-0 py-0",
};

/**
 * Shared square button primitive backed by semantic UI tokens.
 */
export function Button({
  children,
  className = "",
  size = "md",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const composedClassName = [
    "ui-focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-app border",
    "transition-[background-color,border-color,color,opacity,transform]",
    "duration-(--transition-fast) disabled:cursor-not-allowed disabled:opacity-50",
    sizeClassNames[size],
    variantClassNames[variant],
    className,
  ].join(" ").trim();

  return (
    <button className={composedClassName} type={type} {...props}>
      {children}
    </button>
  );
}
