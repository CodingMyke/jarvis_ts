/**
 * Modelli per la route API della memoria semantica.
 */

/** Payload richiesto per creare un record di memoria semantica (POST body). */
export interface CreateSemanticMemoryRequest {
  /** Contenuto della memoria (obbligatorio). */
  content: string;
  /** Chiave opzionale per identificare/raggruppare la memoria. */
  key?: string | null;
  /** Livello di importanza (es. "low" | "medium" | "high"). */
  importance?: string;
}

/** Record di memoria semantica restituito dall'API. */
export interface SemanticMemoryResponse {
  id: string;
  content: string;
  key: string | null;
  importance: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/** Risposta di successo POST memoria semantica. */
export interface CreateSemanticMemorySuccessResponse {
  success: true;
  memory: SemanticMemoryResponse;
}

/** Risposta di errore generica. */
export interface MemoryErrorResponse {
  success: false;
  error: string;
  message?: string;
}

export type CreateSemanticMemoryResponse =
  | CreateSemanticMemorySuccessResponse
  | MemoryErrorResponse;

/** Payload per aggiornare un record (PATCH body). */
export interface UpdateSemanticMemoryRequest {
  /** ID del record da aggiornare. */
  id: string;
  content?: string;
  key?: string | null;
  importance?: string;
}

/** Risposta GET lista. */
export interface GetSemanticMemoriesSuccessResponse {
  success: true;
  memories: SemanticMemoryResponse[];
  count: number;
}

/** Risposta GET singolo (quando ?id= presente). */
export interface GetSemanticMemorySuccessResponse {
  success: true;
  memory: SemanticMemoryResponse;
}

/** Risposta PATCH. */
export interface UpdateSemanticMemorySuccessResponse {
  success: true;
  memory: SemanticMemoryResponse;
}

/** Risposta DELETE. */
export interface DeleteSemanticMemorySuccessResponse {
  success: true;
  deleted: { id: string };
}
