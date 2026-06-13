"use client";

import { Button } from "@/app/design/atoms/shared/Button";

export interface ReelGenerationButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export function ReelGenerationButton({
  label,
  onClick,
  disabled = false,
  busy = false,
}: ReelGenerationButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled || busy}
      onClick={onClick}
      className="h-9 px-3 text-xs"
    >
      {busy ? "Generating..." : label}
    </Button>
  );
}
