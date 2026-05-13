import { createServiceRoleSupabaseClient } from "../app/_server/supabase/service-role";
import { processNextReelGenerationJob } from "../app/_features/academy/reels/server/reel-worker.service";

const POLL_INTERVAL_MS = 15_000;

function getWorkerUserId(): string {
  const userId = process.env.REELS_WORKER_USER_ID;
  if (!userId) {
    throw new Error("REELS_WORKER_USER_ID is required");
  }
  return userId;
}

async function runLoop() {
  const userId = getWorkerUserId();
  const supabase = createServiceRoleSupabaseClient();

  while (true) {
    const result = await processNextReelGenerationJob(supabase, userId);

    if (result.error) {
      console.error("[reels-worker] job failed:", result.error);
    } else if (result.processed) {
      console.log("[reels-worker] processed one reel generation job");
    } else {
      console.log("[reels-worker] no pending jobs");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

runLoop().catch((error) => {
  console.error("[reels-worker] fatal startup error:", error);
  process.exit(1);
});
