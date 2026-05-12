"use client";

import { Button } from "@/app/design/atoms/shared/Button";
import type { ReelRow } from "@/app/_features/academy/reels";

export interface ReelDeleteDialogProps {
  reel: ReelRow | null;
  open: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ReelDeleteDialog({
  reel,
  open,
  busy = false,
  onCancel,
  onConfirm,
}: ReelDeleteDialogProps) {
  if (!open || !reel) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-[#11131a] p-6">
        <h3 className="text-xl font-semibold text-foreground">Delete reel</h3>
        <p className="mt-2 text-sm text-muted">
          Confirm permanent deletion for <strong>{reel.title ?? reel.idea}</strong>.
        </p>
        <div className="mt-6 flex gap-3">
          <Button type="button" onClick={() => void onConfirm()} disabled={busy}>
            Confirm delete
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
