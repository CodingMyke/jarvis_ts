"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/design/atoms/shared/Button";
import { useAppShellProgression } from "@/app/design/templates/app-shell/useAppShellProgression";
import { ProgressionLevelPanel } from "@/app/design/molecules/progression/ProgressionLevelPanel";
import { ProgressionDeadlineReviewDialog } from "@/app/design/organisms/progression/ProgressionDeadlineReviewDialog";
import { ProgressionGoalFormDialog } from "@/app/design/organisms/progression/ProgressionGoalFormDialog";
import { ProgressionGoalList } from "@/app/design/organisms/progression/ProgressionGoalList";
import { ProgressionTodayPanel } from "@/app/design/organisms/progression/ProgressionTodayPanel";
import { ProgressionXpHistorySidebar } from "@/app/design/organisms/progression/ProgressionXpHistorySidebar";
import { useProgressionWorkspace } from "./useProgressionWorkspace";

export function ProgressionTemplate() {
  const workspace = useProgressionWorkspace();
  const { setOpenProgressionHistory } = useAppShellProgression();
  const openHistoryRef = useRef(workspace.openHistory);

  useEffect(() => {
    openHistoryRef.current = workspace.openHistory;
  }, [workspace.openHistory]);

  useEffect(() => {
    const openHistory = () => {
      openHistoryRef.current();
    };

    setOpenProgressionHistory(() => openHistory);

    return () => {
      setOpenProgressionHistory(null);
    };
  }, [setOpenProgressionHistory]);

  if (workspace.deadlineGoal) {
    return (
      <ProgressionDeadlineReviewDialog
        goal={workspace.deadlineGoal}
        onComplete={workspace.resolveDeadlineComplete}
        onFail={workspace.resolveDeadlineFail}
        onPostpone={workspace.resolveDeadlinePostpone}
      />
    );
  }

  if (workspace.status === "loading" && !workspace.filteredGoals.length) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm text-muted">Caricamento progressione...</p>
      </div>
    );
  }

  if (workspace.status === "error" && workspace.error) {
    return (
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
        <p className="text-sm text-red-100">{workspace.error}</p>
        <div className="mt-4">
          <Button type="button" onClick={workspace.retry}>
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted/80">Project system</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
              Progressione
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Mantieni chiari gli obiettivi, premi i check-in utili e chiudi subito le scadenze
              che bloccano il flusso.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <div className="space-y-6">
            <ProgressionLevelPanel {...workspace.levelProgress} />
            <ProgressionTodayPanel
              todayItems={workspace.todayItems}
              weeklyItems={workspace.weeklyItems}
              onCheckIn={workspace.checkIn}
              onUndoCheckIn={workspace.undoCheckIn}
            />
          </div>
          <ProgressionGoalList
            goals={workspace.filteredGoals}
            selectedFilter={workspace.selectedFilter}
            onSelectFilter={workspace.setSelectedFilter}
            onCreateGoal={workspace.openCreateGoal}
            onEditGoal={workspace.openEditGoal}
            onDuplicateGoal={workspace.openDuplicateGoal}
            onDeleteGoal={workspace.deleteGoal}
            onStartGoal={workspace.startGoal}
            onCompleteGoal={workspace.completeGoal}
            onFailGoal={workspace.failGoal}
          />
        </div>
      </section>

      <ProgressionGoalFormDialog
        open={workspace.isFormOpen}
        mode={workspace.formMode}
        initialValue={workspace.formInitialValue}
        onClose={workspace.closeGoalDialog}
        onSubmit={workspace.submitGoalForm}
      />

      <ProgressionXpHistorySidebar
        open={workspace.historyOpen}
        history={workspace.history}
        status={workspace.historyStatus}
        onClose={workspace.closeHistory}
      />
    </>
  );
}
