import type { ReactNode } from "react";
import { Text } from "../atoms";

export interface FormFieldProps {
  children: ReactNode;
  error?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
}

export function FormField({
  children,
  error,
  hint,
  htmlFor,
  label,
}: FormFieldProps) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="block text-sm text-foreground">{label}</span>
      {children}
      {error ? (
        <Text className="text-sm" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-sm" tone="muted">
          {hint}
        </Text>
      ) : null}
    </label>
  );
}
