"use client";

import { useState } from "react";
import { Button } from "@/app/design/atoms/shared/Button";
import type { ReelRow, UpdateReelInput } from "@/app/_features/academy/reels";

export interface ReelEditDrawerProps {
  reel: ReelRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (input: UpdateReelInput) => Promise<void>;
}

export function ReelEditDrawer({
  reel,
  open,
  busy = false,
  onClose,
  onSave,
}: ReelEditDrawerProps) {
  const [draft, setDraft] = useState<UpdateReelInput>(() => ({
    idea: reel?.idea,
    title: reel?.title ?? null,
    caption: reel?.caption ?? null,
    body: reel?.body ?? null,
    hashtags: reel?.hashtags ?? [],
    notes: reel?.notes ?? null,
    scheduled_at: reel?.scheduled_at ?? null,
    published_at: reel?.published_at ?? null,
  }));

  if (!open || !reel) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-white/10 bg-[#11131a] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Edit reel</p>
          <h3 className="text-xl font-semibold text-foreground">{reel.title ?? reel.idea}</h3>
        </div>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="space-y-2 text-sm text-muted">
          <span>Idea</span>
          <input
            value={draft.idea ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, idea: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Title</span>
          <input
            value={draft.title ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value || null }))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Caption</span>
          <textarea
            value={draft.caption ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value || null }))}
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Body</span>
          <textarea
            value={draft.body ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value || null }))}
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Hashtags</span>
          <input
            value={(draft.hashtags ?? []).join(", ")}
            onChange={(event) => {
              const hashtags = event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
              setDraft((current) => ({ ...current, hashtags }));
            }}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Notes</span>
          <textarea
            value={draft.notes ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value || null }))}
            className="min-h-20 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={() => void onSave(draft)} disabled={busy}>
          Save changes
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
