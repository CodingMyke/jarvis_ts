import { IconButton } from "@/app/_shared/ui";
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
        isExpanded ? "border-line" : "border-transparent"
      }`}
    >
      <IconButton
        className={`h-8 w-8 shrink-0 transition-opacity duration-(--transition-fast) ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        icon={isExpanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUpIcon className="h-5 w-5" />}
        label={isExpanded ? "Riduci chat" : "Espandi chat"}
        onClick={toggleExpanded}
        variant="ghost"
      />

      {isExpanded ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-sm text-copy">
            {title?.trim() || "Conversazione"}
          </span>
        </div>
      ) : null}

      {isExpanded && showDeleteAction ? (
        <IconButton
          className="h-8 w-8 shrink-0 hover:text-danger"
          icon={<TrashIcon className="h-4 w-4" />}
          label="Elimina chat"
          onClick={openDeleteDialog}
          variant="ghost"
        />
      ) : null}
    </div>
  );
}
