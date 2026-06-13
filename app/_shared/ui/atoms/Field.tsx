import type { InputHTMLAttributes } from "react";

export type FieldProps = InputHTMLAttributes<HTMLInputElement>;

export function Field({ className = "", type = "text", ...props }: FieldProps) {
  return (
    <input
      className={[
        "w-full rounded-app border border-line bg-field px-3 py-2.5 text-copy",
        "placeholder:text-copy-muted focus:border-line-accent focus:outline-none",
        className,
      ].join(" ").trim()}
      type={type}
      {...props}
    />
  );
}
