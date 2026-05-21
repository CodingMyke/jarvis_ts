"use client";

import { Field, TextArea } from "@/app/_shared/ui";
import { ReelGenerationButton } from "./ReelGenerationButton";

export interface ReelEditFieldGenerateAction {
  ariaLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltip?: string;
}

export interface ReelEditFieldProps {
  controlClassName?: string;
  generateAction?: ReelEditFieldGenerateAction;
  id: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  value: string;
}

export function ReelEditField({
  controlClassName,
  generateAction,
  id,
  label,
  multiline = false,
  onChange,
  value,
}: ReelEditFieldProps) {
  return (
    <div className="space-y-2 text-sm text-muted">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{label}</label>
        {generateAction ? (
          <ReelGenerationButton
            busy={generateAction.busy}
            disabled={generateAction.disabled}
            iconOnly
            label={generateAction.ariaLabel}
            onClick={generateAction.onClick}
            tooltip={generateAction.tooltip}
          />
        ) : null}
      </div>

      {multiline ? (
        <TextArea
          id={id}
          aria-label={label}
          className={controlClassName}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <Field
          id={id}
          aria-label={label}
          className={controlClassName}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </div>
  );
}
