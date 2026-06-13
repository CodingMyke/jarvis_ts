"use client";

import { SettingsPanel } from "@/app/design/organisms/auth/SettingsPanel";
import { AppPageHeader } from "@/app/design/templates/shared/AppPageHeader";

export function SettingsTemplate() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <AppPageHeader
        title="Impostazioni"
        subtitle="Gestisci account, integrazioni e configurazioni personali."
      />
      <SettingsPanel />
    </section>
  );
}
