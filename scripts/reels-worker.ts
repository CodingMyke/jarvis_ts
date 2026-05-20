import { createServiceRoleSupabaseClient } from "../app/_server/supabase/service-role";
import { processDueAutomationRuns } from "../app/_features/academy/reels/server/reel-worker.service";

const POLL_INTERVAL_MS = 15_000;

async function runLoop() {
  const supabase = createServiceRoleSupabaseClient();

  while (true) {
    const result = await processDueAutomationRuns(supabase);

    if (result.failed > 0) {
      console.error("[reels-worker] some automation runs failed to spawn", result);
    } else if (result.spawned > 0) {
      console.log("[reels-worker] spawned automation runs", result);
    } else {
      console.log("[reels-worker] no due automation runs");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

runLoop().catch((error) => {
  console.error("[reels-worker] fatal startup error:", error);
  process.exit(1);
});
