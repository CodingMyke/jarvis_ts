import { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = "", ...props }: TextInputProps) {
  const baseStyles =
    "flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-foreground placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder-zinc-500";

  return <input className={`${baseStyles} ${className}`} {...props} />;
}
