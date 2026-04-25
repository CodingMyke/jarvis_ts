"use client";

import { useSearchParams } from "next/navigation";
import { JARVIS_CONFIG } from "@/app/_features/assistant/lib/jarvis.config";
import { LoginPanel } from "@/app/design/organisms/auth/LoginPanel";

export function LoginTemplate() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next");
  const redirectToAfterLogin = next && next.startsWith("/") ? next : "/dashboard";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          {JARVIS_CONFIG.assistantName}
        </h1>
        <p className="max-w-sm text-muted">
          Accedi con il tuo account Google per utilizzare l&apos;assistente.
        </p>
      </div>
      <LoginPanel
        error={error ? decodeURIComponent(error) : null}
        redirectToAfterLogin={redirectToAfterLogin}
      />
    </main>
  );
}
