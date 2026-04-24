interface TodoListHeaderProps {
  pendingCount: number;
  completedCount: number;
}

export function TodoListHeader({
  pendingCount,
  completedCount,
}: TodoListHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground">Cose da fare</h3>
        <p className="text-xs text-muted">
          {pendingCount} da fare
          {completedCount > 0
            ? ` • ${completedCount} completat${completedCount === 1 ? "o" : "i"}`
            : ""}
        </p>
      </div>
    </div>
  );
}
