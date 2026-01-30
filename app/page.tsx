import { LoginPageClient } from "@/app/components/organisms";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

/**
 * Pagina di login (prima schermata). Se l'utente è già loggato il middleware lo reindirizza a /assistant.
 */
export default function LoginPage() {
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
      <LoginPageClient />
    </main>
  );
}
