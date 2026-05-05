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
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
        <p className="text-sm text-red-100">{result.error}</p>
      </div>
    );
  }

  return <ProgressionTemplate initialGoals={result.goals} />;
}
