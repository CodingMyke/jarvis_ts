import { Button, DialogFrame } from "@/app/_shared/ui";
import { useFloatingChatContext } from "@/app/design/organisms/assistant/floating-chat/useFloatingChatContext";

export function FloatingChatDeleteDialog() {
  const {
    isDialogAnimatedIn,
    isDialogVisible,
    closeDeleteDialog,
    confirmDelete,
  } = useFloatingChatContext();

  if (!isDialogVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-[background-color,backdrop-filter] duration-(--transition-fast) ${
        isDialogAnimatedIn ? "bg-scrim-strong backdrop-blur-sm" : "bg-black/0 backdrop-blur-0"
      }`}
      style={{ willChange: isDialogAnimatedIn ? "backdrop-filter" : "auto" }}
      onClick={closeDeleteDialog}
    >
      <div
        className={`mx-4 transition-[transform,opacity] duration-(--transition-fast) ${
          isDialogAnimatedIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{ willChange: isDialogAnimatedIn ? "transform, opacity" : "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <DialogFrame
          description="Sei sicuro di voler eliminare definitivamente questa chat? Verrà rimossa dal database e non potrà essere recuperata."
          footer={(
            <div className="flex justify-end gap-3">
              <Button className="px-4 py-2 text-sm" onClick={closeDeleteDialog} variant="ghost">
                Annulla
              </Button>
              <Button className="px-4 py-2 text-sm" onClick={confirmDelete} variant="danger">
                Elimina chat
              </Button>
            </div>
          )}
          title="Elimina chat"
        />
      </div>
    </div>
  );
}
