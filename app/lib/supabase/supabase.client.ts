import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "./types";

let clientInstance: SupabaseClient | null = null;

/**
 * Legge la configurazione Supabase dalle variabili d'ambiente.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

/**
 * Crea un'istanza del client Supabase (senza cookie/SSR).
 * Per Server Components e Route Handlers usare createClient da "./server".
 * Per Client Components usare createClient da "./client".
 */
export function createSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  return createSupabaseJsClient(config.url, config.anonKey);
}

/**
 * Restituisce il client Supabase singleton (senza cookie).
 * Usato dal DatabaseProvider quando non si ha il contesto request (es. background).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance === null) {
    clientInstance = createSupabaseClient();
  }
  return clientInstance;
}
