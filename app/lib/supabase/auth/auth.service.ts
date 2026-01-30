import { createClient } from "@/app/lib/supabase/client";

/**
 * Servizio auth lato client.
 * Incapsula login/logout con Supabase Auth (Google OAuth).
 */

const getAuthCallbackUrl = (next?: string): string => {
  if (typeof window === "undefined") return "";
  const base = `${window.location.origin}/auth/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
};

/**
 * Avvia il login con Google. Reindirizza l'utente alla pagina di autorizzazione Google.
 * Dopo il consenso, Supabase reindirizza a /auth/callback che scambia il code con la sessione.
 * @param next - Path (es. "/assistant") dove reindirizzare dopo il login; default "/"
 */
export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = createClient();
  const redirectTo = getAuthCallbackUrl(next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;
  if (data?.url) window.location.href = data.url;
}

/**
 * Effettua il logout e invalida la sessione Supabase.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.reload();
}
