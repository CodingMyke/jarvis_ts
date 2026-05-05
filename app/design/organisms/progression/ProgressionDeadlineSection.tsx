import type { ReactNode } from "react";
import { getAuthContext } from "@/app/_server";
import { getProgressionDeadlineReview } from "@/app/_features/progression";
import { ProgressionDeadlineReviewDialog } from "./ProgressionDeadlineReviewDialog";

interface ProgressionDeadlineSectionProps {
  children: ReactNode;
}

export async function ProgressionDeadlineSection({
  children,
}: ProgressionDeadlineSectionProps) {
  const auth = await getAuthContext();
  if (!auth) {
    return children;
  }

  const result = await getProgressionDeadlineReview(auth.supabase, auth.userId);
  if (!result.success) {
    return (
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
        <p className="text-sm text-red-100">{result.error}</p>
      </div>
    );
  }

  const deadlineGoal = result.review.expiredGoals[0];
  if (!deadlineGoal) {
    return children;
  }

  return (
    <ProgressionDeadlineReviewDialog
      goal={{
        id: deadlineGoal.id,
        title: deadlineGoal.title,
        description: deadlineGoal.description,
        deadline: deadlineGoal.deadline,
        canPostpone: deadlineGoal.deadline_change_count < 1,
      }}
    />
  );
}
