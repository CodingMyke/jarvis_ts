import { executeAutomationRunProcess } from "../app/_features/academy/reels/server/reel-automation-runner.service";
import { createServiceRoleSupabaseClient } from "../app/_server/supabase/service-role";

function getRequiredArg(flag: string): string {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;

  if (!value) {
    throw new Error(`Missing required argument: ${flag}`);
  }

  return value;
}

async function main() {
  const supabase = createServiceRoleSupabaseClient();
  const result = await executeAutomationRunProcess(supabase, {
    runId: getRequiredArg("--run-id"),
    userId: getRequiredArg("--user-id"),
    flow: getRequiredArg("--flow") as "reel_scripting" | "reel_idea_generation",
    trigger: getRequiredArg("--trigger") as "scheduled" | "manual",
    slot: process.argv.includes("--slot") ? getRequiredArg("--slot") : null,
  });

  if (!result.success) {
    throw new Error(result.message ?? "Automation run failed");
  }
}

main().catch((error) => {
  console.error("[reel-automation-run] fatal error:", error);
  process.exit(1);
});
