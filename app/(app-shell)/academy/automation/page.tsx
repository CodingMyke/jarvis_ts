import { ReelAutomationSettingsPanel } from "@/app/design/organisms/settings/ReelAutomationSettingsPanel";
import { AcademyPageHeader } from "@/app/design/templates/academy/AcademyPageHeader";

export default function AcademyAutomationPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <AcademyPageHeader
        title="Automazione"
        subtitle="Impostazioni per worker e automazioni Reel."
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <ReelAutomationSettingsPanel />
      </div>
    </section>
  );
}
