"use client";

import { Fragment, useState } from "react";
import { Button } from "@/app/design/atoms/shared/Button";
import { TrashIcon } from "@/app/design/atoms/shared/icons/TrashIcon";
import type { ProgressionGoalFilter } from "./ProgressionGoalList";

export interface ProgressionGoalActionDraft {
  id: string;
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
  status?: "idle" | "loading" | "ready" | "error";
  errorMessage?: string | null;
  onClose: () => void;
  onRetry?: () => void;
  onSubmit: (value: ProgressionGoalDraft) => void;
}

function createDraftActionId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const randomHex = () => Math.floor(Math.random() * 16).toString(16);
  const suffix = Array.from({ length: 12 }, randomHex).join("");
  return `00000000-0000-4000-8000-${suffix}`;
}

function createActionDraft(): ProgressionGoalActionDraft {
  return {
    id: createDraftActionId(),
    title: "",
    description: "",
    frequencyType: "daily",
    weekdays: [1, 3, 5],
    targetCount: 3,
    xpPerCheckin: 0,
    active: true,
  };
}

function PlusIcon() {
  return (
    <span aria-hidden="true" className="text-lg leading-none text-foreground">
      +
    </span>
  );
}

function getFailurePenaltyXp(completionXp: number): number {
  return Math.max(1, Math.floor(completionXp / 3));
}

const ACTION_GRID_COLUMNS =
  "md:grid-cols-[minmax(0,1.55fr)_minmax(0,0.8fr)_minmax(0,0.55fr)_auto]";

const ACTION_FIELD_CLASS_NAME =
  "min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm "
  + "text-foreground outline-none";

const ACTION_HEADER_CLASS_NAME =
  "sticky top-0 z-10 col-span-full grid gap-3 bg-[#11131a] px-3 py-2 text-[11px] "
  + "font-semibold uppercase tracking-[0.22em] text-muted";

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
  status = "ready",
  errorMessage = null,
  onClose,
  onRetry,
  onSubmit,
}: ProgressionGoalFormDialogProps) {
  if (!open) {
    return null;
  }

  if (status === "loading" && !initialValue) {
    return (
      <DialogStateView
        title={mode === "create" ? "Nuovo obiettivo" : mode === "edit" ? "Modifica obiettivo" : "Duplica obiettivo"}
        message="Caricamento dettagli obiettivo..."
        onClose={onClose}
      />
    );
  }

  if (status === "error" && !initialValue) {
    return (
      <DialogStateView
        title={mode === "create" ? "Nuovo obiettivo" : mode === "edit" ? "Modifica obiettivo" : "Duplica obiettivo"}
        message={errorMessage ?? "Impossibile caricare i dettagli dell'obiettivo."}
        onClose={onClose}
        onRetry={onRetry}
      />
    );
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

function DialogStateView({
  title,
  message,
  onClose,
  onRetry,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[28px] border border-white/15 bg-[#11131a] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              Riprova
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
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
  const isCreateMode = mode !== "edit";

  function submitDraft(startNow: boolean) {
    onSubmit({
      ...draft,
      startNow,
    });
  }

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
              style={{ colorScheme: "dark" }}
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
        </div>

        {draft.deadline && draft.completionXp > 0 ? (
          <p className="mt-4 text-sm font-medium text-red-300">
            Se fallisci questo obiettivo perderai{" "}
            {getFailurePenaltyXp(draft.completionXp)} XP.
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Azioni ricorrenti</p>
              <p className="text-xs text-muted">
                La penalità in caso di fallimento è un terzo degli XP di completamento.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-10 px-0"
              aria-label="Aggiungi azione"
              onClick={() => {
                setDraft((current) => ({
                  ...current,
                  actions: [...current.actions, createActionDraft()],
                }));
              }}
            >
              <PlusIcon />
            </Button>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto pr-1">
            <div className={`grid gap-3 ${ACTION_GRID_COLUMNS}`}>
              <div className={`${ACTION_HEADER_CLASS_NAME} ${ACTION_GRID_COLUMNS}`}>
                <span>Titolo</span>
                <span>Ricorrenza</span>
                <span>XP</span>
                <span aria-hidden="true" />
              </div>
              {draft.actions.map((action) => (
                <Fragment key={action.id}>
                  <input
                    value={action.title}
                    placeholder="Titolo azione"
                    onChange={(event) => {
                      const title = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        actions: current.actions.map((entry) =>
                          entry.id === action.id ? { ...entry, title } : entry,
                        ),
                      }));
                    }}
                    className={ACTION_FIELD_CLASS_NAME}
                  />
                  <select
                    value={action.frequencyType}
                    onChange={(event) => {
                      const frequencyType = event.target.value as ProgressionGoalActionDraft["frequencyType"];
                      setDraft((current) => ({
                        ...current,
                        actions: current.actions.map((entry) =>
                          entry.id === action.id ? { ...entry, frequencyType } : entry,
                        ),
                      }));
                    }}
                    className={ACTION_FIELD_CLASS_NAME}
                  >
                    <option value="daily">Giornaliera</option>
                    <option value="specific_weekdays">Giorni specifici</option>
                    <option value="weekly_count">Conteggio sett.</option>
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
                        actions: current.actions.map((entry) =>
                          entry.id === action.id ? { ...entry, xpPerCheckin } : entry,
                        ),
                      }));
                    }}
                    className={ACTION_FIELD_CLASS_NAME}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="!p-1 text-red-300 hover:bg-red-500/10 hover:text-red-100"
                    aria-label={`Rimuovi azione ${action.title || "senza titolo"}`}
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        actions: current.actions.filter((entry) => entry.id !== action.id),
                      }));
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          {isCreateMode ? (
            <>
              <Button type="button" variant="secondary" onClick={() => submitDraft(true)}>
                Crea e inizia
              </Button>
              <Button type="button" onClick={() => submitDraft(false)}>
                Crea
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onSubmit(draft);
              }}
            >
              Salva
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
