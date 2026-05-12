import { getAuthContext } from "@/app/_server";
import { getProgressionGoals } from "@/app/_features/progression";
import { ProgressionTemplate } from "@/app/design/templates/progression/ProgressionTemplate";

export async function ProgressionGoalsSection() {
  const auth = await getAuthContext();
  if (!auth) {
    return null;
  }

  const result = await getProgressionGoals(auth.supabase, auth.userId);
  if (!result.success) {
    return (
      <div className="rounded-app border border-line-danger bg-danger-surface p-6">
        <p className="text-sm text-danger-copy">{result.error}</p>
      </div>
    );
  }

  return <ProgressionTemplate initialGoals={result.goals} />;
}
