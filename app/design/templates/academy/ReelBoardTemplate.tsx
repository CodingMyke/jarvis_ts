"use client";

import { ReelKanbanBoard } from "@/app/design/organisms/academy/ReelKanbanBoard";
import { ReelDeleteDialog } from "@/app/design/organisms/academy/ReelDeleteDialog";
import { ReelEditDrawer } from "@/app/design/organisms/academy/ReelEditDrawer";
import { ReelQuickCreate } from "@/app/design/organisms/academy/ReelQuickCreate";
import type { ReelBoard } from "@/app/_features/academy/reels";
import { AcademyPageHeader } from "./AcademyPageHeader";
import { useReelBoardWorkspace } from "./useReelBoardWorkspace";

export interface ReelBoardTemplateProps {
  initialBoard?: ReelBoard;
}

export function ReelBoardTemplate({ initialBoard }: ReelBoardTemplateProps) {
  const workspace = useReelBoardWorkspace(initialBoard);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AcademyPageHeader
          title="Reel board"
          subtitle="Plan, refine, move, and publish your reels from one editorial workspace."
        />
      </div>

      {workspace.errorMessage ? (
        <div className="rounded-app border border-line-danger bg-danger-surface px-4 py-3 text-sm text-danger-copy">
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
        generationBusy={workspace.isGenerating}
        generationDisabled={
          workspace.editingReel ? workspace.isGenerationDisabled(workspace.editingReel) : false
        }
        globalGenerationDisabled={
          workspace.editingReel ? workspace.isGlobalGenerationDisabled(workspace.editingReel) : true
        }
        onClose={workspace.closeEditReel}
        onSave={workspace.saveEditReel}
        onGenerateGlobal={workspace.queueGlobalGeneration}
        onGenerateField={workspace.queueFieldGeneration}
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
