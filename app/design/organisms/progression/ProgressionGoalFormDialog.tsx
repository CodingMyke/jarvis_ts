"use client";

import { useState } from "react";
import { Button } from "@/app/design/atoms/shared/Button";
import type { ProgressionGoalFilter } from "./ProgressionGoalList";

export interface ProgressionGoalActionDraft {
  title: string;
  description: string;
  frequencyType: "daily" | "specific_weekdays" | "weekly_count";
  weekdays: number[];
  targetCount: number;
  xpPerCheckin: number;
  active: boolean;
}

export interface ProgressionGoalDraft {
  id?: string;
  title: string;
  description: string;
  deadline: string;
  completionXp: number;
  startNow: boolean;
  status?: ProgressionGoalFilter;
  actions: ProgressionGoalActionDraft[];
}

interface ProgressionGoalFormDialogProps {
  open: boolean;
  mode: "create" | "edit" | "duplicate";
  initialValue: ProgressionGoalDraft | null;
  onClose: () => void;
  onSubmit: (value: ProgressionGoalDraft) => void;
}

const DEFAULT_ACTION: ProgressionGoalActionDraft = {
  title: "",
  description: "",
  frequencyType: "daily",
  weekdays: [1, 3, 5],
  targetCount: 3,
  xpPerCheckin: 0,
  active: true,
};

const DEFAULT_DRAFT: ProgressionGoalDraft = {
  title: "",
  description: "",
  deadline: "",
  completionXp: 0,
  startNow: false,
  actions: [],
};

function normalizeDraft(value: ProgressionGoalDraft | null, mode: "create" | "edit" | "duplicate") {
  if (!value) {
    return DEFAULT_DRAFT;
  }

  return {
    ...value,
    id: mode === "edit" ? value.id : undefined,
    startNow: mode === "edit" ? value.startNow : false,
  };
}

export function ProgressionGoalFormDialog({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
}: ProgressionGoalFormDialogProps) {
  if (!open) {
    return null;
  }

  const dialogKey = `${mode}-${initialValue?.id ?? "new"}`;

  return (
    <ProgressionGoalFormDialogBody
      key={dialogKey}
      mode={mode}
      initialValue={initialValue}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

interface ProgressionGoalFormDialogBodyProps {
  mode: "create" | "edit" | "duplicate";
  initialValue: ProgressionGoalDraft | null;
  onClose: () => void;
  onSubmit: (value: ProgressionGoalDraft) => void;
}

function ProgressionGoalFormDialogBody({
  mode,
  initialValue,
  onClose,
  onSubmit,
}: ProgressionGoalFormDialogBodyProps) {
  const [draft, setDraft] = useState<ProgressionGoalDraft>(() => normalizeDraft(initialValue, mode));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[28px] border border-white/15 bg-[#11131a] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {mode === "create" ? "Nuovo obiettivo" : mode === "edit" ? "Modifica obiettivo" : "Duplica obiettivo"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Mantieni il focus su un obiettivo chiaro e sulle azioni ricorrenti essenziali.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-muted"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-muted">
            <span>Titolo</span>
            <input
              value={draft.title}
              onChange={(event) => {
                setDraft((current) => ({ ...current, title: event.target.value }));
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-muted">
            <span>Scadenza</span>
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => {
                setDraft((current) => ({ ...current, deadline: event.target.value }));
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-muted md:col-span-2">
            <span>Descrizione</span>
            <textarea
              value={draft.description}
              onChange={(event) => {
                setDraft((current) => ({ ...current, description: event.target.value }));
              }}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-muted">
            <span>XP completamento</span>
            <input
              type="number"
              min={0}
              value={draft.completionXp}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  completionXp: Number(event.target.value || 0),
                }));
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-foreground outline-none"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={draft.startNow}
              onChange={(event) => {
                setDraft((current) => ({ ...current, startNow: event.target.checked }));
              }}
            />
            <span>Avvia subito</span>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Azioni ricorrenti</p>
              <p className="text-xs text-muted">La penalità in caso di fallimento usa gli XP di completamento.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  actions: [...current.actions, DEFAULT_ACTION],
                }));
              }}
            >
              Aggiungi azione
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {draft.actions.map((action, index) => (
              <div
                key={`${action.title}-${index}`}
                className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 md:grid-cols-4"
              >
                <input
                  value={action.title}
                  placeholder="Titolo azione"
                  onChange={(event) => {
                    const title = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      actions: current.actions.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, title } : entry,
                      ),
                    }));
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
                />
                <select
                  value={action.frequencyType}
                  onChange={(event) => {
                    const frequencyType = event.target.value as ProgressionGoalActionDraft["frequencyType"];
                    setDraft((current) => ({
                      ...current,
                      actions: current.actions.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, frequencyType } : entry,
                      ),
                    }));
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="specific_weekdays">Specific weekdays</option>
                  <option value="weekly_count">Weekly count</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={action.xpPerCheckin}
                  placeholder="XP"
                  onChange={(event) => {
                    const xpPerCheckin = Number(event.target.value || 0);
                    setDraft((current) => ({
                      ...current,
                      actions: current.actions.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, xpPerCheckin } : entry,
                      ),
                    }));
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDraft((current) => ({
                      ...current,
                      actions: current.actions.filter((_, entryIndex) => entryIndex !== index),
                    }));
                  }}
                >
                  Rimuovi
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSubmit(draft);
            }}
          >
            Salva
          </Button>
        </div>
      </div>
    </div>
  );
}
