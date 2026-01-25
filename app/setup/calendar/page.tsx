"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Pagina di setup per Google Calendar OAuth.
 * Mostra le istruzioni e gestisce il flusso di autenticazione.
 */
export default function CalendarSetupPage() {
  const searchParams = useSearchParams();
  
  const status = useMemo(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const refreshToken = searchParams.get("refresh_token");
    const accessToken = searchParams.get("access_token");

    if (success === "true" && refreshToken) {
      return {
        type: "success" as const,
        message: "Autenticazione completata con successo!",
        refreshToken,
        accessToken: accessToken || undefined,
      };
    } else if (error) {
      return {
        type: "error" as const,
        message: decodeURIComponent(error),
      };
    }
    
    return { type: "idle" as const };
  }, [searchParams]);

  const handleAuthorize = () => {
    window.location.href = "/api/auth/google";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiato negli appunti!");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          Setup Google Calendar
        </h1>

        {/* Istruzioni */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Passi da seguire:
          </h2>
          <ol className="list-decimal space-y-2 pl-6 text-muted">
            <li>
              Assicurati di aver configurato{" "}
              <code className="rounded bg-white/10 px-2 py-1 text-sm">
                GOOGLE_CALENDAR_CLIENT_ID
              </code>{" "}
              e{" "}
              <code className="rounded bg-white/10 px-2 py-1 text-sm">
                GOOGLE_CALENDAR_CLIENT_SECRET
              </code>{" "}
              nel file <code className="rounded bg-white/10 px-2 py-1 text-sm">.env.local</code>
            </li>
            <li>
              Aggiungi questo redirect URI nelle credenziali OAuth su Google Cloud Console:
              <br />
              <code className="mt-1 block rounded bg-white/10 px-2 py-1 text-sm">
                {process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}
                /api/auth/callback/google
              </code>
            </li>
            <li>Clicca il pulsante qui sotto per autorizzare l&apos;applicazione</li>
            <li>Copia il refresh token nel tuo <code className="rounded bg-white/10 px-2 py-1 text-sm">.env.local</code></li>
          </ol>
        </div>

        {/* Status */}
        {status.type === "success" && (
          <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-6">
            <h3 className="mb-4 text-lg font-semibold text-green-400">
              ✅ Autenticazione completata!
            </h3>
            <p className="mb-4 text-muted">
              Copia questo refresh token nel tuo file <code className="rounded bg-white/10 px-2 py-1 text-sm">.env.local</code>:
            </p>
            <div className="mb-4 flex items-center gap-2">
              <code className="flex-1 rounded bg-white/10 p-3 text-sm break-all">
                {status.refreshToken}
              </code>
              <button
                onClick={() => copyToClipboard(status.refreshToken!)}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                Copia
              </button>
            </div>
            <p className="text-sm text-muted">
              Aggiungi questa riga al tuo <code className="rounded bg-white/10 px-2 py-1 text-xs">.env.local</code>:
            </p>
            <code className="mt-2 block rounded bg-white/10 p-3 text-xs break-all">
              GOOGLE_CALENDAR_REFRESH_TOKEN={status.refreshToken}
            </code>
          </div>
        )}

        {status.type === "error" && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <h3 className="mb-2 text-lg font-semibold text-red-400">
              ❌ Errore
            </h3>
            <p className="text-muted">{status.message}</p>
          </div>
        )}

        {/* Pulsante di autorizzazione */}
        {status.type !== "success" && (
          <button
            onClick={handleAuthorize}
            className="rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            Autorizza Google Calendar
          </button>
        )}

        {/* Link per tornare */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors"
          >
            ← Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
