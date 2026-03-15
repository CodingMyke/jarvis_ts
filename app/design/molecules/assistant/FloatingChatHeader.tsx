import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@/app/design/atoms/shared";
import { useFloatingChatContext } from "@/app/design/organisms/assistant/floating-chat/useFloatingChatContext";

interface FloatingChatHeaderProps {
  title?: string | null;
  showDeleteAction: boolean;
}

export function FloatingChatHeader({
  title,
  showDeleteAction,
}: FloatingChatHeaderProps) {
  const {
    isExpanded,
    showControls,
    toggleExpanded,
    openDeleteDialog,
  } = useFloatingChatContext();

  return (
    <div
      className={`flex h-10 shrink-0 items-center gap-2 border-b px-2 transition-[border-color,opacity] duration-(--transition-medium) ${
        isExpanded ? "border-white/10" : "border-transparent"
      }`}
    >
      <button
        onClick={toggleExpanded}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity duration-(--transition-fast) hover:text-foreground ${
          showControls ? "text-muted opacity-100" : "opacity-0"
        }`}
        aria-label={isExpanded ? "Riduci chat" : "Espandi chat"}
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5" />
        ) : (
          <ChevronUpIcon className="h-5 w-5" />
        )}
      </button>

      {isExpanded ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-sm text-foreground">
            {title?.trim() || "Conversazione"}
          </span>
        </div>
      ) : null}

      {isExpanded && showDeleteAction ? (
        <button
          onClick={openDeleteDialog}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-red-400"
          aria-label="Elimina chat"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
