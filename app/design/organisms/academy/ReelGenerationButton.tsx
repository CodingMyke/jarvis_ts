"use client";

import { IconButton } from "@/app/_shared/ui";
import { Button, SparklesIcon, type ButtonVariant } from "@/app/design/atoms/shared";

export interface ReelGenerationButtonProps {
  className?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  iconOnly?: boolean;
  tooltip?: string;
  variant?: ButtonVariant;
}

export function ReelGenerationButton({
  className = "",
  label,
  onClick,
  disabled = false,
  busy = false,
  iconOnly = false,
  tooltip,
  variant = "secondary",
}: ReelGenerationButtonProps) {
  const buttonDisabled = disabled || busy;

  if (iconOnly) {
    return (
      <IconButton
        className={`h-7 w-7 shrink-0 ${className}`.trim()}
        disabled={buttonDisabled}
        icon={<SparklesIcon className="h-3.5 w-3.5" />}
        label={label}
        onClick={onClick}
        title={tooltip ?? label}
        variant={variant}
      />
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      disabled={buttonDisabled}
      onClick={onClick}
      className={`h-9 px-3 text-xs ${className}`.trim()}
      title={tooltip ?? label}
    >
      <SparklesIcon className="h-4 w-4" />
      {busy ? "Generating..." : label}
    </Button>
  );
}
