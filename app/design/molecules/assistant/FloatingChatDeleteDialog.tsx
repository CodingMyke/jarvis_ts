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
        isDialogAnimatedIn ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-0"
      }`}
      style={{ willChange: isDialogAnimatedIn ? "backdrop-filter" : "auto" }}
      onClick={closeDeleteDialog}
    >
      <div
        className={`mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-black/80 p-6 backdrop-blur-xl transition-[transform,opacity] duration-(--transition-fast) ${
          isDialogAnimatedIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{ willChange: isDialogAnimatedIn ? "transform, opacity" : "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold text-foreground">Elimina chat</h3>
        <p className="mb-6 text-sm text-muted">
          Sei sicuro di voler eliminare definitivamente questa chat? Verrà rimossa dal
          database e non potrà essere recuperata.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={closeDeleteDialog}
            className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground"
          >
            Annulla
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30"
          >
            Elimina chat
          </button>
        </div>
      </div>
    </div>
  );
}
