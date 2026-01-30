import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./supabase.client";

/**
 * Crea il client Supabase per lato client (Client Components, browser).
 */
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local"
    );
  }
  return createBrowserClient(config.url, config.anonKey);
}
