/**
 * Modelli per la route API della memoria episodica.
 */

import type { Json } from "@/app/lib/supabase/database.types";

/** Payload richiesto per creare un record di memoria episodica (POST body). */
export interface CreateEpisodicMemoryRequest {
  /** Contenuto della memoria (obbligatorio). */
  content: string;
  /** Livello di importanza (es. "low" | "medium" | "high"). */
  importance?: string;
  /** Metadati aggiuntivi (oggetto JSON). */
  metadata?: Json;
  /** Giorni di vita del record prima della scadenza (opzionale). */
  ttl_days?: number | null;
}

/** Record di memoria episodica restituito dall'API. */
export interface EpisodicMemoryResponse {
  id: string;
  content: string;
  importance: string;
  metadata: Json;
  ttl_days: number | null;
  user_id: string;
  created_at: string;
}

/** Risposta di successo POST memoria episodica. */
export interface CreateEpisodicMemorySuccessResponse {
  success: true;
  memory: EpisodicMemoryResponse;
}

/** Risposta di errore generica. */
export interface MemoryErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export type CreateEpisodicMemoryResponse =
  | CreateEpisodicMemorySuccessResponse
  | MemoryErrorResponse;
