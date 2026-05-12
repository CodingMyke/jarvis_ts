import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  label: string;
  variant?: ButtonVariant;
}

/**
 * Shared icon-only action button with required accessible label.
 */
export function IconButton({
  className = "",
  icon,
  label,
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      className={className}
      size="icon"
      variant={variant}
      {...props}
    >
      {icon}
    </Button>
  );
}
