"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/atoms";

/**
 * Contenuto client della pagina impostazioni: info account Google e logout.
 */
export function SettingsPageClient() {
  const { user, isLoading, signOut } = useAuth();

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

  const avatarUrl =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "Utente";

  return (
    <div className="mx-auto max-w-md space-y-8 p-6">
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-medium text-foreground">
          Account Google
        </h2>
        <div className="flex items-center gap-4">
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={56}
              height={56}
              className="rounded-full"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{fullName}</p>
            {user.email && (
              <p className="truncate text-sm text-muted" title={user.email}>
                {user.email}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={() => signOut()} type="button">
          Esci
        </Button>
        <Link
          href="/assistant"
          className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          Torna all&apos;assistente
        </Link>
      </div>
    </div>
  );
}
