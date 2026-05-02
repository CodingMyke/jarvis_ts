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
      <div className="rounded-[28px] border border-red-400/20 bg-red-500/5 p-6">
        <p className="text-sm text-red-100">{result.error}</p>
      </div>
    );
  }

  return <ProgressionLevelPanel {...result.level.levelProgress} />;
}
