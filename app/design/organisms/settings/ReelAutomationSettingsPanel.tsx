"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getReelAutomationSettings,
  updateReelAutomationSettings,
} from "@/app/_features/academy/reels";
import { Field, TextArea } from "@/app/_shared/ui";
import { Button } from "@/app/design/atoms/shared/Button";
import { SettingsSectionHeader } from "@/app/design/molecules/auth/SettingsSectionHeader";

export function ReelAutomationSettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [runTimesRaw, setRunTimesRaw] = useState("");
  const [editorialContext, setEditorialContext] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const result = await getReelAutomationSettings();
      if (!active) {
        return;
      }

      if (!result.success) {
        setErrorMessage(result.errorMessage);
        setIsLoading(false);
        return;
      }

      setEnabled(result.settings.enabled);
      setRunTimesRaw(result.settings.runTimes.join(", "));
      setEditorialContext(result.settings.editorialContext ?? "");
      setIsLoading(false);
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const runTimes = useMemo(
    () =>
      runTimesRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [runTimesRaw],
  );

  async function save() {
    setErrorMessage(null);

    if (enabled && runTimes.length === 0) {
      setErrorMessage("At least one run time is required when automation is enabled.");
      return;
    }

    setIsSaving(true);
    const result = await updateReelAutomationSettings({
      enabled,
      runTimes,
      editorialContext: editorialContext.trim() || null,
    });
    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setEnabled(result.settings.enabled);
    setRunTimesRaw(result.settings.runTimes.join(", "));
    setEditorialContext(result.settings.editorialContext ?? "");
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading reel automation settings...</p>;
  }

  return (
    <section className="space-y-4">
      <SettingsSectionHeader
        title="Reel automation"
        description="Manage scheduled AI generation for Academy reels."
      />
      {errorMessage ? (
        <p className="text-sm text-danger-copy" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <label className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>Enable automation</span>
        <input
          type="checkbox"
          aria-label="Enable reel automation"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
      </label>
      <label className="space-y-2 text-sm text-muted">
        <span>Run times (HH:mm, comma-separated)</span>
        <Field
          value={runTimesRaw}
          onChange={(event) => setRunTimesRaw(event.target.value)}
          placeholder="09:00, 14:00"
        />
      </label>
      <label className="space-y-2 text-sm text-muted">
        <span>Editorial context</span>
        <TextArea
          value={editorialContext}
          onChange={(event) => setEditorialContext(event.target.value)}
          className="min-h-24"
        />
      </label>
      <Button type="button" onClick={() => void save()} disabled={isSaving}>
        Save reel automation
      </Button>
    </section>
  );
}
