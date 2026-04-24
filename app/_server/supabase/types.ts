import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Interfaccia per il provider di database.
 * Permette di sostituire Supabase con un altro backend senza cambiare l'API pubblica.
 */
export interface DatabaseProvider {
  /** Nome del provider per logging/debug */
  readonly name: string;

  /**
   * Verifica se il provider è configurato correttamente.
   */
  isConfigured(): boolean;

  /**
   * Restituisce il client Supabase (solo per il provider Supabase).
   * Per altri provider potrebbe essere undefined o un client equivalente.
   */
  getClient(): SupabaseClient | null;
}

/**
 * Configurazione per il client Supabase.
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
