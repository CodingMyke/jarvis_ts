/**
 * Tipi pubblici per il modulo embeddings.
 * Contratti indipendenti dal provider (Gemini, OpenAI, etc.)
 */

/**
 * Task type per ottimizzare gli embedding in base all'uso.
 * @see https://ai.google.dev/gemini-api/docs/embeddings#supported-task-types
 */
export type EmbedTaskType =
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING"
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY"
  | "CODE_RETRIEVAL_QUERY"
  | "QUESTION_ANSWERING"
  | "FACT_VERIFICATION";

/**
 * Opzioni per la generazione di embedding.
 */
export interface EmbedOptions {
  /** Task type per ottimizzare l'embedding (es. RETRIEVAL_QUERY per query, RETRIEVAL_DOCUMENT per documenti) */
  taskType?: EmbedTaskType;
  /** Dimensionalità dell'output (768, 1536 o 3072). Default: 768. */
  outputDimensionality?: 768 | 1536 | 3072;
}

/**
 * Contratto per un provider di embedding.
 * L'implementazione può usare Gemini, OpenAI o altri servizi.
 */
export interface EmbeddingProvider {
  readonly name: string;

  /**
   * Genera l'embedding per un singolo testo.
   */
  embed(text: string, options?: EmbedOptions): Promise<number[]>;

  /**
   * Genera embedding per più testi in una singola chiamata.
   */
  embedBatch(texts: string[], options?: EmbedOptions): Promise<number[][]>;

  /**
   * Verifica se il provider è configurato (es. API key presente).
   */
  isConfigured(): boolean;
}
