"use client";

import { startTransition, useMemo, useState } from "react";
import {
  EMPTY_REEL_BOARD,
  createReel,
  deleteReel,
  generateReelField,
  generateReelFields,
  updateReel,
  updateReelStatus,
} from "@/app/_features/academy/reels";
import type {
  ReelBoard,
  ReelRow,
  ReelStatus,
  UpdateReelInput,
} from "@/app/_features/academy/reels";

function sortColumn(reels: ReelRow[]): ReelRow[] {
  return [...reels].sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

function normalizeBoard(board: ReelBoard): ReelBoard {
  return {
    count: board.count,
    columns: {
      idea: sortColumn(board.columns.idea),
      script: sortColumn(board.columns.script),
      to_record: sortColumn(board.columns.to_record),
      to_edit: sortColumn(board.columns.to_edit),
      ready: sortColumn(board.columns.ready),
      published: sortColumn(board.columns.published),
    },
  };
}

function replaceReel(board: ReelBoard, nextReel: ReelRow): ReelBoard {
  const columns = {
    idea: board.columns.idea.filter((reel) => reel.id !== nextReel.id),
    script: board.columns.script.filter((reel) => reel.id !== nextReel.id),
    to_record: board.columns.to_record.filter((reel) => reel.id !== nextReel.id),
    to_edit: board.columns.to_edit.filter((reel) => reel.id !== nextReel.id),
    ready: board.columns.ready.filter((reel) => reel.id !== nextReel.id),
    published: board.columns.published.filter((reel) => reel.id !== nextReel.id),
  };

  columns[nextReel.status as ReelStatus].push(nextReel);

  return normalizeBoard({
    columns,
    count: Object.values(columns).reduce((total, reels) => total + reels.length, 0),
  });
}

function removeReel(board: ReelBoard, reelId: string): ReelBoard {
  const columns = {
    idea: board.columns.idea.filter((reel) => reel.id !== reelId),
    script: board.columns.script.filter((reel) => reel.id !== reelId),
    to_record: board.columns.to_record.filter((reel) => reel.id !== reelId),
    to_edit: board.columns.to_edit.filter((reel) => reel.id !== reelId),
    ready: board.columns.ready.filter((reel) => reel.id !== reelId),
    published: board.columns.published.filter((reel) => reel.id !== reelId),
  };

  return {
    columns,
    count: Math.max(0, board.count - 1),
  };
}

export interface ReelBoardWorkspaceResult {
  board: ReelBoard;
  errorMessage: string | null;
  createIdea: string;
  setCreateIdea: (value: string) => void;
  isCreating: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  editingReel: ReelRow | null;
  deletingReel: ReelRow | null;
  draggedReelId: string | null;
  visiblePublished: ReelRow[];
  openEditReel: (reel: ReelRow) => void;
  closeEditReel: () => void;
  saveEditReel: (input: UpdateReelInput) => Promise<void>;
  queueGlobalGeneration: (input: UpdateReelInput) => Promise<void>;
  queueFieldGeneration: (
    field: "title" | "caption" | "body" | "hashtags",
    input: UpdateReelInput,
  ) => Promise<void>;
  isGlobalGenerationDisabled: (reel: ReelRow) => boolean;
  isGenerationDisabled: (reel: ReelRow) => boolean;
  requestDeleteReel: (reel: ReelRow) => void;
  cancelDeleteReel: () => void;
  confirmDeleteReel: () => Promise<void>;
  submitCreateReel: () => Promise<void>;
  startDraggingReel: (reelId: string) => void;
  finishDraggingReel: () => void;
  moveReelToStatus: (reelId: string, status: ReelStatus) => Promise<void>;
  clearError: () => void;
}

export function createEmptyReelBoard(): ReelBoard {
  return EMPTY_REEL_BOARD;
}

export function useReelBoardWorkspace(initialBoard?: ReelBoard): ReelBoardWorkspaceResult {
  const [board, setBoard] = useState<ReelBoard>(() => normalizeBoard(initialBoard ?? EMPTY_REEL_BOARD));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createIdea, setCreateIdea] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingReel, setEditingReel] = useState<ReelRow | null>(null);
  const [deletingReel, setDeletingReel] = useState<ReelRow | null>(null);
  const [draggedReelId, setDraggedReelId] = useState<string | null>(null);

  const visiblePublished = useMemo(
    () => board.columns.published.slice(0, 3),
    [board.columns.published],
  );

  function clearError() {
    setErrorMessage(null);
  }

  async function submitCreateReel() {
    setIsCreating(true);
    setErrorMessage(null);

    const result = await createReel({ idea: createIdea });
    setIsCreating(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setCreateIdea("");
    startTransition(() => {
      setBoard((currentBoard) => replaceReel(currentBoard, result.reel));
    });
  }

  async function saveEditReel(input: UpdateReelInput) {
    if (!editingReel) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    const result = await updateReel(editingReel.id, input);
    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setEditingReel(null);
    startTransition(() => {
      setBoard((currentBoard) => replaceReel(currentBoard, result.reel));
    });
  }

  async function queueGlobalGeneration(input: UpdateReelInput) {
    if (!editingReel) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const saved = await updateReel(editingReel.id, input);
    if (!saved.success) {
      setIsGenerating(false);
      setErrorMessage(saved.errorMessage);
      return;
    }

    const queued = await generateReelFields(editingReel.id);
    setIsGenerating(false);

    if (!queued.success) {
      setErrorMessage(queued.errorMessage);
      return;
    }

    startTransition(() => {
      const nextReel = { ...saved.reel, generation_status: "processing" as const };
      setBoard((currentBoard) => replaceReel(currentBoard, nextReel));
      setEditingReel(nextReel);
    });
  }

  async function queueFieldGeneration(
    field: "title" | "caption" | "body" | "hashtags",
    input: UpdateReelInput,
  ) {
    if (!editingReel) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const saved = await updateReel(editingReel.id, input);
    if (!saved.success) {
      setIsGenerating(false);
      setErrorMessage(saved.errorMessage);
      return;
    }

    const queued = await generateReelField(editingReel.id, field);
    setIsGenerating(false);

    if (!queued.success) {
      setErrorMessage(queued.errorMessage);
      return;
    }

    startTransition(() => {
      const nextReel = { ...saved.reel, generation_status: "processing" as const };
      setBoard((currentBoard) => replaceReel(currentBoard, nextReel));
      setEditingReel(nextReel);
    });
  }

  async function confirmDeleteReel() {
    if (!deletingReel) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    const reelId = deletingReel.id;
    const result = await deleteReel(reelId);
    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setDeletingReel(null);
    startTransition(() => {
      setBoard((currentBoard) => removeReel(currentBoard, result.reelId));
    });
  }

  async function moveReelToStatus(reelId: string, status: ReelStatus) {
    const previousBoard = board;
    const currentReel = Object.values(board.columns).flat().find((reel) => reel.id === reelId);

    if (!currentReel || currentReel.status === status) {
      setDraggedReelId(null);
      return;
    }

    const optimisticReel = {
      ...currentReel,
      status,
      updated_at: new Date().toISOString(),
    };

    setDraggedReelId(null);
    setErrorMessage(null);
    startTransition(() => {
      setBoard((currentBoard) => replaceReel(currentBoard, optimisticReel));
    });

    const result = await updateReelStatus(reelId, { status });
    if (!result.success) {
      setErrorMessage(result.errorMessage);
      startTransition(() => {
        setBoard(previousBoard);
      });
      return;
    }

    startTransition(() => {
      setBoard((currentBoard) => replaceReel(currentBoard, result.reel));
    });
  }

  function isReelFieldComplete(value: string | null | undefined): boolean {
    return Boolean(value && value.trim().length > 0);
  }

  function isGlobalGenerationDisabled(reel: ReelRow): boolean {
    return (
      isReelFieldComplete(reel.title)
      && isReelFieldComplete(reel.caption)
      && isReelFieldComplete(reel.body)
      && isReelFieldComplete(reel.hashtags)
    );
  }

  function isGenerationDisabled(reel: ReelRow): boolean {
    return reel.generation_status === "processing";
  }

  return {
    board,
    errorMessage,
    createIdea,
    setCreateIdea,
    isCreating,
    isSaving,
    isGenerating,
    editingReel,
    deletingReel,
    draggedReelId,
    visiblePublished,
    openEditReel: (reel) => {
      setEditingReel(reel);
      setErrorMessage(null);
    },
    closeEditReel: () => setEditingReel(null),
    saveEditReel,
    queueGlobalGeneration,
    queueFieldGeneration,
    isGlobalGenerationDisabled,
    isGenerationDisabled,
    requestDeleteReel: (reel) => {
      setDeletingReel(reel);
      setErrorMessage(null);
    },
    cancelDeleteReel: () => setDeletingReel(null),
    confirmDeleteReel,
    submitCreateReel,
    startDraggingReel: setDraggedReelId,
    finishDraggingReel: () => setDraggedReelId(null),
    moveReelToStatus,
    clearError,
  };
}
