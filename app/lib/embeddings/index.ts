/**
 * Modulo Embeddings - Generazione di vettori da testo.
 *
 * API stabili (embed, embedBatch): restano invariate anche cambiando
 * modello o provider (Gemini, OpenAI, etc.).
 */

export type {
  EmbedTaskType,
  EmbedOptions,
  EmbeddingProvider,
} from "./types";

export {
  embed,
  embedBatch,
  isEmbeddingConfigured,
  getEmbeddingProvider,
  EmbeddingsService,
  type EmbeddingProviderType,
} from "./embeddings.service";

export { GeminiEmbeddingProvider } from "./gemini-embedding.provider";
export { GEMINI_EMBEDDING_MODEL } from "./config";
