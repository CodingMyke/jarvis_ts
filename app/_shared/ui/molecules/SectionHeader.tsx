import type { ReactNode } from "react";
import { Heading, Text } from "../atoms";

export type SectionHeaderDensity = "default" | "dense";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  density?: SectionHeaderDensity;
}

export function SectionHeader({
  action,
  density = "default",
  description,
  title,
}: SectionHeaderProps) {
  const spacingClassName = density === "dense" ? "gap-1" : "gap-2";

  return (
    <div className={["flex items-start justify-between", spacingClassName].join(" ")}>
      <div className="min-w-0 space-y-1">
        <Heading as="h2" className="text-lg">
          {title}
        </Heading>
        {description ? (
          <Text tone="muted" className="text-sm">
            {description}
          </Text>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
