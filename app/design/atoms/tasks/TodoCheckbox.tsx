interface TodoCheckboxProps {
  checked: boolean;
  onClick: () => void;
}

export function TodoCheckbox({
  checked,
  onClick,
}: TodoCheckboxProps) {
  return (
    <button
      onClick={onClick}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
        checked
          ? "border-accent bg-accent/20"
          : "border-white/20 bg-transparent hover:border-white/40"
      }`}
      aria-label={checked ? "Segna come non completato" : "Segna come completato"}
    >
      {checked ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : null}
    </button>
  );
}
