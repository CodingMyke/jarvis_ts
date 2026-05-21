import { Suspense } from "react";
import { ProgressionDeadlineSection } from "@/app/design/organisms/progression/ProgressionDeadlineSection";
import { ProgressionDeadlineSkeleton } from "@/app/design/organisms/progression/ProgressionDeadlineSkeleton";
import { ProgressionGoalsSection } from "@/app/design/organisms/progression/ProgressionGoalsSection";
import { ProgressionGoalsSkeleton } from "@/app/design/organisms/progression/ProgressionGoalsSkeleton";
import { ProgressionHistorySection } from "@/app/design/organisms/progression/ProgressionHistorySection";
import { ProgressionLevelSection } from "@/app/design/organisms/progression/ProgressionLevelSection";
import { ProgressionLevelSkeleton } from "@/app/design/organisms/progression/ProgressionLevelSkeleton";
import { ProgressionTodaySection } from "@/app/design/organisms/progression/ProgressionTodaySection";
import { ProgressionTodaySkeleton } from "@/app/design/organisms/progression/ProgressionTodaySkeleton";
import { AppPageHeader } from "@/app/design/templates/shared/AppPageHeader";

export function ProgressionPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AppPageHeader
          title="Progressione"
          subtitle="Mantieni chiari gli obiettivi, premi i check-in utili e chiudi subito le scadenze che bloccano il flusso."
        />
      </div>

      <Suspense fallback={<ProgressionDeadlineSkeleton />}>
        <ProgressionDeadlineSection>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className="space-y-6">
              <Suspense fallback={<ProgressionLevelSkeleton />}>
                <ProgressionLevelSection />
              </Suspense>

              <Suspense fallback={<ProgressionTodaySkeleton />}>
                <ProgressionTodaySection />
              </Suspense>
            </div>

            <Suspense fallback={<ProgressionGoalsSkeleton />}>
              <ProgressionGoalsSection />
            </Suspense>
          </div>

          <ProgressionHistorySection />
        </ProgressionDeadlineSection>
      </Suspense>
    </section>
  );
}
