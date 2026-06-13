"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUserSettings, updateUserSettings } from "@/app/_features/user-settings";
import { Button } from "@/app/design/atoms/shared";
import { SettingsSectionHeader } from "@/app/design/molecules/auth/SettingsSectionHeader";
import { useAuth } from "@/app/_features/auth/hooks/useAuth";
import { AppPanel } from "@/app/_shared/ui";

export function SettingsPanel() {
  const { user, isLoading, signOut } = useAuth();
  const [timezone, setTimezone] = useState("");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    void getUserSettings().then((result) => {
      if (isActive && result.success) {
        setTimezone(result.settings.timezone);
      }
    });

    return () => {
      isActive = false;
    };
  }, [user]);

  async function handleSaveTimezone(): Promise<void> {
    setIsSavingTimezone(true);
    const result = await updateUserSettings({ timezone });
    setIsSavingTimezone(false);

    if (result.success) {
      setTimezone(result.settings.timezone);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <span className="text-muted">Caricamento...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted">Nessun account collegato.</p>
        <Link href="/">
          <Button variant="primary" type="button">
            Accedi
          </Button>
        </Link>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
  const fullName =
    user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? user.email
    ?? "Utente";

  return (
    <div className="mx-auto max-w-md space-y-8 p-6">
      <AppPanel as="section" variant="overlay">
        <SettingsSectionHeader
          title="Account Google"
          description="Identità usata per autenticazione e integrazioni."
        />
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={56}
              height={56}
              className="rounded-full"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{fullName}</p>
            {user.email ? (
              <p className="truncate text-sm text-muted" title={user.email}>
                {user.email}
              </p>
            ) : null}
          </div>
        </div>
      </AppPanel>

      <AppPanel as="section" variant="overlay">
        <SettingsSectionHeader
          title="Timezone"
          description="Fuso orario usato per automazioni, progression e logiche locali."
        />
        <div className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-foreground">
            <span>Fuso orario</span>
            <input
              aria-label="Timezone"
              className="min-h-10 rounded-app border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Europe/Rome"
            />
          </label>
          <Button
            variant="secondary"
            type="button"
            onClick={() => void handleSaveTimezone()}
            disabled={isSavingTimezone}
          >
            {isSavingTimezone ? "Salvataggio..." : "Salva timezone"}
          </Button>
        </div>
      </AppPanel>

      <AppPanel as="section" variant="overlay">
        <SettingsSectionHeader
          title="Integrazioni"
          description="Collega i servizi esterni usati dall'assistente."
        />
        <Link
          href="/setup/calendar"
          className="ui-button ui-button-secondary ui-focus-ring min-h-10 px-4 py-2 text-sm"
        >
          Configura calendario
        </Link>
      </AppPanel>

      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={() => signOut()} type="button">
          Esci
        </Button>
      </div>
    </div>
  );
}
