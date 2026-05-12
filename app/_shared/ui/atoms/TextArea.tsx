import type { TextareaHTMLAttributes } from "react";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      className={[
        "min-h-28 w-full resize-y rounded-app border border-line bg-field px-3 py-2.5 text-copy",
        "placeholder:text-copy-muted focus:border-line-accent focus:outline-none",
        className,
      ].join(" ").trim()}
      {...props}
    />
  );
}
