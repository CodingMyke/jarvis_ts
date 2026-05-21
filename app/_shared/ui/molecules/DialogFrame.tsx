import type { ReactNode } from "react";
import { Divider, Heading, Surface, Text } from "../atoms";

export interface DialogFrameProps {
  children?: ReactNode;
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
}

export function DialogFrame({
  children,
  className = "",
  description,
  footer,
  title,
}: DialogFrameProps) {
  return (
    <Surface className={["w-full max-w-lg p-6", className].join(" ").trim()} variant="overlay">
      <div className="space-y-4">
        <div className="space-y-1">
          <Heading as="h2" className="text-lg">
            {title}
          </Heading>
          {description ? (
            <Text className="text-sm" tone="muted">
              {description}
            </Text>
          ) : null}
        </div>
        {children ? (
          <>
            <Divider />
            <div>{children}</div>
          </>
        ) : null}
        {footer ? (
          <>
            <Divider />
            <div>{footer}</div>
          </>
        ) : null}
      </div>
    </Surface>
  );
}
