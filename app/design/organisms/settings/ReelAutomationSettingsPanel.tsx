"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getReelAutomationSettings,
  reelAutomationSettingsPatchSchema,
  updateReelAutomationSettings,
} from "@/app/_features/academy/reels";
import { Field, TextArea } from "@/app/_shared/ui";
import { Button } from "@/app/design/atoms/shared/Button";
import { SettingsSectionHeader } from "@/app/design/molecules/auth/SettingsSectionHeader";

const DEFAULT_IDEAS_PER_RUN = "3";
const DEFAULT_MAX_PENDING_AI_IDEAS = "10";
const DEFAULT_LATEST_PUBLISHED_REELS_COUNT = "3";

export function ReelAutomationSettingsPanel() {
  const [scriptingEnabled, setScriptingEnabled] = useState(false);
  const [scriptingRunTimesRaw, setScriptingRunTimesRaw] = useState("");
  const [scriptingContext, setScriptingContext] = useState("");
  const [ideaGenerationEnabled, setIdeaGenerationEnabled] = useState(false);
  const [ideaGenerationRunTimesRaw, setIdeaGenerationRunTimesRaw] = useState("");
  const [ideaGenerationContext, setIdeaGenerationContext] = useState("");
  const [ideasPerRun, setIdeasPerRun] = useState(DEFAULT_IDEAS_PER_RUN);
  const [maxPendingAiIdeas, setMaxPendingAiIdeas] = useState(DEFAULT_MAX_PENDING_AI_IDEAS);
  const [latestPublishedReelsCount, setLatestPublishedReelsCount] = useState(
    DEFAULT_LATEST_PUBLISHED_REELS_COUNT,
  );
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

      setScriptingEnabled(result.settings.reelScripting.enabled);
      setScriptingRunTimesRaw(result.settings.reelScripting.runTimes.join(", "));
      setScriptingContext(result.settings.reelScripting.scriptingContext ?? "");
      setIdeaGenerationEnabled(result.settings.reelIdeaGeneration.enabled);
      setIdeaGenerationRunTimesRaw(result.settings.reelIdeaGeneration.runTimes.join(", "));
      setIdeaGenerationContext(result.settings.reelIdeaGeneration.ideaGenerationContext ?? "");
      setIdeasPerRun(String(result.settings.reelIdeaGeneration.ideasPerRun));
      setMaxPendingAiIdeas(String(result.settings.reelIdeaGeneration.maxPendingAiIdeas));
      setLatestPublishedReelsCount(String(result.settings.reelIdeaGeneration.latestPublishedReelsCount));
      setIsLoading(false);
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const scriptingRunTimes = useMemo(
    () =>
      scriptingRunTimesRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [scriptingRunTimesRaw],
  );

  const ideaGenerationRunTimes = useMemo(
    () =>
      ideaGenerationRunTimesRaw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [ideaGenerationRunTimesRaw],
  );

  function restoreDefaultIfCleared(
    value: string,
    fallback: string,
    setter: (nextValue: string) => void,
  ) {
    if (value.trim().length === 0) {
      setter(fallback);
    }
  }

  async function save() {
    setErrorMessage(null);

    const payload = {
      reelScripting: {
        enabled: scriptingEnabled,
        runTimes: scriptingRunTimes,
        scriptingContext: scriptingContext.trim() || null,
      },
      reelIdeaGeneration: {
        enabled: ideaGenerationEnabled,
        runTimes: ideaGenerationRunTimes,
        ideasPerRun: Number(ideasPerRun),
        maxPendingAiIdeas: Number(maxPendingAiIdeas),
        latestPublishedReelsCount: Number(latestPublishedReelsCount),
        ideaGenerationContext: ideaGenerationContext.trim() || null,
      },
    };

    const parsedPayload = reelAutomationSettingsPatchSchema.safeParse(payload);
    if (!parsedPayload.success) {
      const firstIssue = parsedPayload.error.issues[0];
      setErrorMessage(firstIssue?.message ?? "Invalid reel automation settings.");
      return;
    }

    setIsSaving(true);
    const result = await updateReelAutomationSettings(parsedPayload.data);
    setIsSaving(false);

    if (!result.success) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setScriptingEnabled(result.settings.reelScripting.enabled);
    setScriptingRunTimesRaw(result.settings.reelScripting.runTimes.join(", "));
    setScriptingContext(result.settings.reelScripting.scriptingContext ?? "");
    setIdeaGenerationEnabled(result.settings.reelIdeaGeneration.enabled);
    setIdeaGenerationRunTimesRaw(result.settings.reelIdeaGeneration.runTimes.join(", "));
    setIdeaGenerationContext(result.settings.reelIdeaGeneration.ideaGenerationContext ?? "");
    setIdeasPerRun(String(result.settings.reelIdeaGeneration.ideasPerRun));
    setMaxPendingAiIdeas(String(result.settings.reelIdeaGeneration.maxPendingAiIdeas));
    setLatestPublishedReelsCount(String(result.settings.reelIdeaGeneration.latestPublishedReelsCount));
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
      <div className="space-y-4 rounded-app border border-line bg-surface-raised p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Reel scripting</h3>
          <p className="text-sm text-muted">Schedule script generation for existing ideas.</p>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>Enable scripting automation</span>
          <input
            type="checkbox"
            aria-label="Enable scripting automation"
            checked={scriptingEnabled}
            onChange={(event) => setScriptingEnabled(event.target.checked)}
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Scripting run times</span>
          <Field
            aria-label="Scripting run times"
            value={scriptingRunTimesRaw}
            onChange={(event) => setScriptingRunTimesRaw(event.target.value)}
            placeholder="09:00, 14:00"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Scripting context</span>
          <TextArea
            aria-label="Scripting context"
            value={scriptingContext}
            onChange={(event) => setScriptingContext(event.target.value)}
            className="min-h-24"
          />
        </label>
      </div>

      <div className="space-y-4 rounded-app border border-line bg-surface-raised p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Reel idea generation</h3>
          <p className="text-sm text-muted">Configure AI idea intake and backlog limits.</p>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>Enable idea generation automation</span>
          <input
            type="checkbox"
            aria-label="Enable idea generation automation"
            checked={ideaGenerationEnabled}
            onChange={(event) => setIdeaGenerationEnabled(event.target.checked)}
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Idea generation run times</span>
          <Field
            aria-label="Idea generation run times"
            value={ideaGenerationRunTimesRaw}
            onChange={(event) => setIdeaGenerationRunTimesRaw(event.target.value)}
            placeholder="10:00, 18:00"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Ideas per run</span>
          <Field
            aria-label="Ideas per run"
            type="number"
            min={1}
            value={ideasPerRun}
            onChange={(event) => setIdeasPerRun(event.target.value)}
            onBlur={() => restoreDefaultIfCleared(ideasPerRun, DEFAULT_IDEAS_PER_RUN, setIdeasPerRun)}
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Max pending AI ideas</span>
          <Field
            aria-label="Max pending AI ideas"
            type="number"
            min={1}
            value={maxPendingAiIdeas}
            onChange={(event) => setMaxPendingAiIdeas(event.target.value)}
            onBlur={() =>
              restoreDefaultIfCleared(
                maxPendingAiIdeas,
                DEFAULT_MAX_PENDING_AI_IDEAS,
                setMaxPendingAiIdeas,
              )
            }
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Latest published reels count</span>
          <Field
            aria-label="Latest published reels count"
            type="number"
            min={1}
            value={latestPublishedReelsCount}
            onChange={(event) => setLatestPublishedReelsCount(event.target.value)}
            onBlur={() =>
              restoreDefaultIfCleared(
                latestPublishedReelsCount,
                DEFAULT_LATEST_PUBLISHED_REELS_COUNT,
                setLatestPublishedReelsCount,
              )
            }
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Idea generation context</span>
          <TextArea
            aria-label="Idea generation context"
            value={ideaGenerationContext}
            onChange={(event) => setIdeaGenerationContext(event.target.value)}
            className="min-h-24"
          />
        </label>
      </div>
      <Button type="button" onClick={() => void save()} disabled={isSaving}>
        Save reel automation
      </Button>
    </section>
  );
}
