import { getAuthContext } from "@/app/_server";
import { getProgressionToday } from "@/app/_features/progression";
import { ProgressionTodayPanel } from "./ProgressionTodayPanel";

export async function ProgressionTodaySection() {
  const auth = await getAuthContext();
  if (!auth) {
    return null;
  }

  const result = await getProgressionToday(auth.supabase, auth.userId);
  if (!result.success) {
    return (
      <div className="rounded-app border border-line-danger bg-danger-surface p-6">
        <p className="text-sm text-danger-copy">{result.error}</p>
      </div>
    );
  }

  return (
    <ProgressionTodayPanel
      initialTodayItems={result.today.todayItems}
      initialWeeklyItems={result.today.weeklyItems}
      timezone={result.today.timezone}
    />
  );
}
