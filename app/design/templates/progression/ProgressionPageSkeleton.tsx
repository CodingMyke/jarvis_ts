import { ProgressionDeadlineSkeleton } from "@/app/design/organisms/progression/ProgressionDeadlineSkeleton";
import { ProgressionGoalsSkeleton } from "@/app/design/organisms/progression/ProgressionGoalsSkeleton";
import { ProgressionLevelSkeleton } from "@/app/design/organisms/progression/ProgressionLevelSkeleton";
import { ProgressionTodaySkeleton } from "@/app/design/organisms/progression/ProgressionTodaySkeleton";

export function ProgressionPageSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded-app bg-surface-raised" />
        <div className="h-10 w-56 animate-pulse rounded-app bg-surface-raised" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-app bg-surface-raised" />
      </div>

      <ProgressionDeadlineSkeleton />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <ProgressionLevelSkeleton />
          <ProgressionTodaySkeleton />
        </div>
        <ProgressionGoalsSkeleton />
      </div>
    </section>
  );
}
