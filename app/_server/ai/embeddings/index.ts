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
