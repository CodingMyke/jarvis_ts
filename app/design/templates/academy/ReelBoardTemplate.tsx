"use client";

import { ReelKanbanBoard } from "@/app/design/organisms/academy/ReelKanbanBoard";
import { ReelDeleteDialog } from "@/app/design/organisms/academy/ReelDeleteDialog";
import { ReelEditDrawer } from "@/app/design/organisms/academy/ReelEditDrawer";
import { ReelQuickCreate } from "@/app/design/organisms/academy/ReelQuickCreate";
import type { ReelBoard } from "@/app/_features/academy/reels";
import { useReelBoardWorkspace } from "./useReelBoardWorkspace";

export interface ReelBoardTemplateProps {
  initialBoard?: ReelBoard;
}

export function ReelBoardTemplate({ initialBoard }: ReelBoardTemplateProps) {
  const workspace = useReelBoardWorkspace(initialBoard);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-[28px] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Academy</p>
        <h1 className="text-2xl font-semibold text-foreground">Reel board</h1>
        <p className="text-sm text-muted">
          Plan, refine, move, and publish your reels from one editorial workspace.
        </p>
      </div>

      {workspace.errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {workspace.errorMessage}
        </div>
      ) : null}

      <ReelQuickCreate
        value={workspace.createIdea}
        onChange={workspace.setCreateIdea}
        onSubmit={workspace.submitCreateReel}
        disabled={workspace.isCreating}
      />

      <ReelKanbanBoard workspace={workspace} />

      <ReelEditDrawer
        key={workspace.editingReel?.id ?? "closed"}
        reel={workspace.editingReel}
        open={workspace.editingReel !== null}
        busy={workspace.isSaving}
        onClose={workspace.closeEditReel}
        onSave={workspace.saveEditReel}
      />

      <ReelDeleteDialog
        reel={workspace.deletingReel}
        open={workspace.deletingReel !== null}
        busy={workspace.isSaving}
        onCancel={workspace.cancelDeleteReel}
        onConfirm={workspace.confirmDeleteReel}
      />
    </section>
  );
}
