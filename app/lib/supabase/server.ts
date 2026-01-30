import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./supabase.client";

/**
 * Crea il client Supabase per lato server (Server Components, Route Handlers, Server Actions).
 * Usa i cookie per gestire la sessione auth.
 * In Next 15+ usa: const cookieStore = await cookies(); createClient(cookieStore);
 */
export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local"
    );
  }
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `setAll` chiamato da un Server Component; può essere ignorato
          // se il middleware refresha le sessioni.
        }
      },
    },
  });
}
