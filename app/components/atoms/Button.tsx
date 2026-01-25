import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "recording";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border-accent/50 bg-accent/20 text-accent hover:bg-accent/30 focus:ring-accent/20",
  secondary:
    "border-white/10 bg-white/5 text-muted hover:bg-white/10 hover:text-foreground",
  recording:
    "border-accent bg-accent/30 text-accent shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-accent/40",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "cursor-pointer flex items-center justify-center rounded-xl border px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
