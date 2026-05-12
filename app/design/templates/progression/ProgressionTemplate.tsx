"use client";

import { ProgressionGoalFormDialog } from "@/app/design/organisms/progression/ProgressionGoalFormDialog";
import { ProgressionGoalList } from "@/app/design/organisms/progression/ProgressionGoalList";
import { useProgressionWorkspace } from "./useProgressionWorkspace";

interface ProgressionTemplateProps {
  initialGoals: unknown[];
}

export function ProgressionTemplate({ initialGoals }: ProgressionTemplateProps) {
  const workspace = useProgressionWorkspace(initialGoals);

  return (
    <>
      {workspace.sectionError ? (
        <div className="mb-4 rounded-app border border-line-danger bg-danger-surface p-4">
          <p className="text-sm text-danger-copy">{workspace.sectionError}</p>
        </div>
      ) : null}

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

      <ProgressionGoalFormDialog
        open={workspace.isFormOpen}
        mode={workspace.formMode}
        initialValue={workspace.formInitialValue}
        status={workspace.formStatus}
        errorMessage={workspace.formError}
        onClose={workspace.closeGoalDialog}
        onRetry={workspace.retryGoalFormLoad}
        onSubmit={workspace.submitGoalForm}
      />
    </>
  );
}
