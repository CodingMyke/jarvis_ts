"use client";

import { useState } from "react";
import { IconButton, Surface } from "@/app/_shared/ui";
import { Button } from "@/app/design/atoms/shared/Button";
import { CloseIcon, SaveIcon } from "@/app/design/atoms/shared/icons";
import type { ReelRow, UpdateReelInput } from "@/app/_features/academy/reels";
import { ReelEditField } from "./ReelEditField";
import { ReelGenerationButton } from "./ReelGenerationButton";

const APPROVE_AI_IDEA_EVENT = "reel:approve-ai-idea";

export interface ReelEditDrawerProps {
  reel: ReelRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (input: UpdateReelInput) => Promise<void>;
  onApprove?: (input: UpdateReelInput) => Promise<void>;
  onGenerateGlobal?: (input: UpdateReelInput) => Promise<void>;
  onGenerateField?: (
    field: "title" | "caption" | "body" | "hashtags",
    input: UpdateReelInput,
  ) => Promise<void>;
  generationDisabled?: boolean;
  generationBusy?: boolean;
  globalGenerationDisabled?: boolean;
}

export function ReelEditDrawer({
  reel,
  open,
  busy = false,
  onClose,
  onSave,
  onApprove,
  onGenerateGlobal,
  onGenerateField,
  generationDisabled = false,
  generationBusy = false,
  globalGenerationDisabled = false,
}: ReelEditDrawerProps) {
  const [draft, setDraft] = useState<UpdateReelInput>(() => ({
    idea: reel?.idea,
    title: reel?.title ?? null,
    caption: reel?.caption ?? null,
    body: reel?.body ?? null,
    hashtags: reel?.hashtags ?? null,
    notes: reel?.notes ?? null,
    scheduled_at: reel?.scheduled_at ?? null,
    published_at: reel?.published_at ?? null,
  }));

  if (!open || !reel) {
    return null;
  }

  async function handleApprove() {
    if (onApprove) {
      await onApprove(draft);
      return;
    }

    window.dispatchEvent(
      new CustomEvent<{ input: UpdateReelInput }>(APPROVE_AI_IDEA_EVENT, {
        detail: { input: draft },
      }),
    );
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
        <div className="flex flex-wrap items-center justify-end gap-2 self-start">
          {reel.status === "ai_idea" ? (
            <Button type="button" variant="secondary" onClick={() => void handleApprove()} disabled={busy}>
              Approve
            </Button>
          ) : null}
          <ReelGenerationButton
            label="Generate all"
            busy={generationBusy}
            disabled={generationDisabled || globalGenerationDisabled || !onGenerateGlobal}
            onClick={() => {
              if (onGenerateGlobal) {
                void onGenerateGlobal(draft);
              }
            }}
            tooltip="Generate all"
            variant="primary"
          />
          <IconButton
            className="h-8 w-8 shrink-0"
            disabled={busy}
            icon={<SaveIcon className="h-5 w-5" />}
            label="Save changes"
            onClick={() => void onSave(draft)}
            title="Save changes"
            variant="primary"
          />
          <IconButton
            className="h-8 w-8 shrink-0"
            icon={<CloseIcon className="h-5 w-5" />}
            label="Close drawer"
            onClick={onClose}
            title="Close drawer"
            variant="secondary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-4">
          <ReelEditField
            controlClassName="min-h-24 py-2"
            id="reel-idea"
            label="Idea"
            multiline
            onChange={(value) => setDraft((current) => ({ ...current, idea: value }))}
            value={draft.idea ?? ""}
          />
          <ReelEditField
            controlClassName="py-2"
            generateAction={{
              ariaLabel: "Generate title",
              busy: generationBusy,
              disabled: generationDisabled || !onGenerateField,
              onClick: () => {
                if (onGenerateField) {
                  void onGenerateField("title", draft);
                }
              },
              tooltip: "Generate",
            }}
            id="reel-title"
            label="Title"
            onChange={(value) => setDraft((current) => ({ ...current, title: value || null }))}
            value={draft.title ?? ""}
          />
          <ReelEditField
            controlClassName="min-h-24 py-2"
            generateAction={{
              ariaLabel: "Generate caption",
              busy: generationBusy,
              disabled: generationDisabled || !onGenerateField,
              onClick: () => {
                if (onGenerateField) {
                  void onGenerateField("caption", draft);
                }
              },
              tooltip: "Generate",
            }}
            id="reel-caption"
            label="Caption"
            multiline
            onChange={(value) => setDraft((current) => ({ ...current, caption: value || null }))}
            value={draft.caption ?? ""}
          />
          <ReelEditField
            controlClassName="py-2"
            generateAction={{
              ariaLabel: "Generate body",
              busy: generationBusy,
              disabled: generationDisabled || !onGenerateField,
              onClick: () => {
                if (onGenerateField) {
                  void onGenerateField("body", draft);
                }
              },
              tooltip: "Generate",
            }}
            id="reel-body"
            label="Body"
            multiline
            onChange={(value) => setDraft((current) => ({ ...current, body: value || null }))}
            value={draft.body ?? ""}
          />
          <ReelEditField
            controlClassName="py-2"
            generateAction={{
              ariaLabel: "Generate hashtags",
              busy: generationBusy,
              disabled: generationDisabled || !onGenerateField,
              onClick: () => {
                if (onGenerateField) {
                  void onGenerateField("hashtags", draft);
                }
              },
              tooltip: "Generate",
            }}
            id="reel-hashtags"
            label="Hashtags"
            onChange={(value) => setDraft((current) => ({ ...current, hashtags: value || null }))}
            value={draft.hashtags ?? ""}
          />
          <ReelEditField
            controlClassName="min-h-20 py-2"
            id="reel-notes"
            label="Notes"
            multiline
            onChange={(value) => setDraft((current) => ({ ...current, notes: value || null }))}
            value={draft.notes ?? ""}
          />
        </div>
      </div>
    </Surface>
  );
}
