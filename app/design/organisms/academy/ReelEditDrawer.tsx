"use client";

import { useState } from "react";
import { Field, Surface, TextArea } from "@/app/_shared/ui";
import { Button } from "@/app/design/atoms/shared/Button";
import { CloseIcon, SaveIcon } from "@/app/design/atoms/shared/icons";
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
    <Surface className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-xl flex-col overflow-hidden border-l shadow-overlay" variant="overlay">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-overlay px-6 py-5 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Edit reel</p>
          <h3
            title={reel.title ?? "No title"}
            className="line-clamp-2 text-xl font-semibold text-foreground"
          >
            {reel.title ?? "No title"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="h-10 w-10 shrink-0 p-0"
            onClick={() => void onSave(draft)}
            disabled={busy}
            aria-label="Save changes"
            title="Save changes"
          >
            <SaveIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-10 shrink-0 p-0"
            onClick={onClose}
            aria-label="Close drawer"
            title="Close drawer"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4">
        <label className="space-y-2 text-sm text-muted">
          <span>Idea</span>
          <TextArea
            value={draft.idea ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, idea: event.target.value }))}
            className="min-h-24 py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Title</span>
          <Field
            value={draft.title ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value || null }))}
            className="py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Caption</span>
          <TextArea
            value={draft.caption ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value || null }))}
            className="min-h-24 py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Body</span>
          <TextArea
            value={draft.body ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value || null }))}
            className="py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Hashtags</span>
          <Field
            value={(draft.hashtags ?? []).join(", ")}
            onChange={(event) => {
              const hashtags = event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
              setDraft((current) => ({ ...current, hashtags }));
            }}
            className="py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Notes</span>
          <TextArea
            value={draft.notes ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value || null }))}
            className="min-h-20 py-2"
          />
        </label>
        </div>
      </div>
    </Surface>
  );
}
