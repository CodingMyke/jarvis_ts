import type { IconProps } from "./Icon.types";

export function SaveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75V5.25A2.25 2.25 0 0 1 6.75 3h8.69c.597 0 1.17.237 1.591.659l2.31 2.31c.422.421.659.994.659 1.591v11.19A2.25 2.25 0 0 1 17.25 21Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v5.25h6V3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-6h7.5v6" />
    </svg>
  );
}
