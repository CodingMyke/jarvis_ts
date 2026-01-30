import { GoogleGenAI } from "@google/genai";
import type { EmbeddingProvider, EmbedOptions } from "./types";
import { GEMINI_EMBEDDING_MODEL } from "./config";

/**
 * Mappa da EmbedTaskType pubblico al taskType della API Gemini.
 */
function toGeminiTaskType(
  taskType?: EmbedOptions["taskType"],
):
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING"
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY"
  | "CODE_RETRIEVAL_QUERY"
  | "QUESTION_ANSWERING"
  | "FACT_VERIFICATION"
  | undefined {
  return taskType;
}

/**
 * Provider di embedding che usa l'API Gemini (embedContent).
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";

  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!key) {
        throw new Error(
          "NEXT_PUBLIC_GEMINI_API_KEY non configurata per gli embedding.",
        );
      }
      this.apiKey = key;
      this.client = new GoogleGenAI({ apiKey: key });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }

  async embed(text: string, options?: EmbedOptions): Promise<number[]> {
    const vectors = await this.embedBatch([text], options);
    return vectors[0] ?? [];
  }

  async embedBatch(
    texts: string[],
    options?: EmbedOptions,
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const client = this.getClient();
    const taskType = toGeminiTaskType(options?.taskType);
    const outputDimensionality = options?.outputDimensionality;

    const response = await client.models.embedContent({
      model: GEMINI_EMBEDDING_MODEL,
      contents: texts,
      ...(taskType && { taskType }),
      ...(outputDimensionality && { outputDimensionality }),
    });

    const rawEmbeddings = response.embeddings ?? [];
    return rawEmbeddings.map((e) => (e.values ? [...e.values] : []));
  }
}
