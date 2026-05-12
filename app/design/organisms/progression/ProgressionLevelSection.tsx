import { getAuthContext } from "@/app/_server";
import { getProgressionLevel } from "@/app/_features/progression";
import { ProgressionLevelPanel } from "@/app/design/molecules/progression/ProgressionLevelPanel";

export async function ProgressionLevelSection() {
  const auth = await getAuthContext();
  if (!auth) {
    return null;
  }

  const result = await getProgressionLevel(auth.supabase, auth.userId);
  if (!result.success) {
    return (
      <div className="rounded-app border border-line-danger bg-danger-surface p-6">
        <p className="text-sm text-danger-copy">{result.error}</p>
      </div>
    );
  }

  return <ProgressionLevelPanel {...result.level.levelProgress} />;
}
