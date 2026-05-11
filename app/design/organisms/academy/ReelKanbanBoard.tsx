"use client";

import type { ReelStatus } from "@/app/_features/academy/reels";
import type { ReelBoardWorkspaceResult } from "@/app/design/templates/academy/useReelBoardWorkspace";
import { ReelKanbanColumn } from "./ReelKanbanColumn";

const COLUMN_TITLES: Record<ReelStatus, string> = {
  idea: "Idea",
  script: "Script",
  to_record: "To Record",
  to_edit: "To Edit",
  ready: "Ready",
  published: "Published",
};

export interface ReelKanbanBoardProps {
  workspace: ReelBoardWorkspaceResult;
}

export function ReelKanbanBoard({ workspace }: ReelKanbanBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ReelKanbanColumn
        title={COLUMN_TITLES.idea}
        status="idea"
        reels={workspace.board.columns.idea}
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
      <ReelKanbanColumn
        title={COLUMN_TITLES.script}
        status="script"
        reels={workspace.board.columns.script}
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
      <ReelKanbanColumn
        title={COLUMN_TITLES.to_record}
        status="to_record"
        reels={workspace.board.columns.to_record}
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
      <ReelKanbanColumn
        title={COLUMN_TITLES.to_edit}
        status="to_edit"
        reels={workspace.board.columns.to_edit}
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
      <ReelKanbanColumn
        title={COLUMN_TITLES.ready}
        status="ready"
        reels={workspace.board.columns.ready}
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
      <ReelKanbanColumn
        title={COLUMN_TITLES.published}
        status="published"
        reels={workspace.visiblePublished}
        showPublishedLink
        onEdit={workspace.openEditReel}
        onDelete={workspace.requestDeleteReel}
        onDragStart={workspace.startDraggingReel}
        onDragEnd={workspace.finishDraggingReel}
        onDropReel={workspace.moveReelToStatus}
        draggedReelId={workspace.draggedReelId}
      />
    </div>
  );
}
