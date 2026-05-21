import type { ReactNode } from "react";
import { Heading, Text } from "../atoms";

export type EmptyStateVariant = "default" | "error";

export interface EmptyStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
}

export function EmptyState({
  action,
  description,
  title,
  variant = "default",
}: EmptyStateProps) {
  const descriptionTone = variant === "error" ? "danger" : "muted";

  return (
    <div className="space-y-2">
      {title ? (
        <Heading as="h3" className="text-base">
          {title}
        </Heading>
      ) : null}
      <Text className="text-sm" tone={descriptionTone}>
        {description}
      </Text>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
