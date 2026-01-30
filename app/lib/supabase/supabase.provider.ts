import type { DatabaseProvider } from "./types";
import { getSupabaseClient } from "./supabase.client";

/**
 * Provider che usa Supabase come backend.
 * Le funzionalità di dominio (es. salvaRicordo) andranno implementate qui
 * e esposte tramite il DatabaseService.
 */
export class SupabaseProvider implements DatabaseProvider {
  readonly name = "Supabase";

  isConfigured(): boolean {
    return getSupabaseClient() !== null;
  }

  getClient() {
    return getSupabaseClient();
  }
}
