import type { IconProps } from "./Icon.types";

export function SparklesIcon({ className = "h-5 w-5" }: IconProps) {
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
        d="m12 3 1.446 4.41a1.5 1.5 0 0 0 .944.944L18.8 9.8l-4.41 1.446a1.5 1.5 0 0 0-.944.944L12 16.6l-1.446-4.41a1.5 1.5 0 0 0-.944-.944L5.2 9.8l4.41-1.446a1.5 1.5 0 0 0 .944-.944L12 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 3v3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 4.5h-3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 16.5v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 17.5h-2" />
    </svg>
  );
}
