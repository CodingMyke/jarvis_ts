import { ReelAutomationSettingsPanel } from "@/app/design/organisms/settings/ReelAutomationSettingsPanel";

export default function AcademyAutomationPage() {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Academy</p>
          <h1 className="text-2xl font-semibold text-foreground">Automazione</h1>
          <p className="text-sm text-muted">Impostazioni per worker e automazioni Reel.</p>
        </div>

        <ReelAutomationSettingsPanel />
      </div>
    </section>
  );
}
