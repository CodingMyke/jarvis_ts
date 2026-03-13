import type { EmbeddingProvider, EmbedOptions } from "./types";
import { GeminiEmbeddingProvider } from "./gemini-embedding.provider";

/**
 * Tipo di provider supportati.
 */
export type EmbeddingProviderType = "gemini";

const providerCache = new Map<EmbeddingProviderType, EmbeddingProvider>();

function getEmbeddingProvider(type: EmbeddingProviderType = "gemini"): EmbeddingProvider {
  if (!providerCache.has(type)) {
    switch (type) {
      case "gemini":
        providerCache.set(type, new GeminiEmbeddingProvider());
        break;
      default:
        throw new Error(`Provider embedding sconosciuto: ${type}`);
    }
  }
  return providerCache.get(type)!;
}

/** Provider di default (Gemini). */
let defaultProvider: EmbeddingProvider | null = null;

function getDefaultProvider(): EmbeddingProvider {
  if (!defaultProvider) {
    defaultProvider = getEmbeddingProvider("gemini");
  }
  return defaultProvider;
}

/**
 * Genera l'embedding per un singolo testo.
 * API stabile: la firma non cambia al variare del modello o del provider.
 *
 * @param text - Testo da trasformare in vettore
 * @param options - Opzioni (taskType, outputDimensionality)
 * @returns Vettore di numeri (embedding)
 */
export async function embed(
  text: string,
  options?: EmbedOptions
): Promise<number[]> {
  return getDefaultProvider().embed(text, options);
}

/**
 * Genera embedding per più testi in una singola chiamata.
 * API stabile: la firma non cambia al variare del modello o del provider.
 *
 * @param texts - Testi da trasformare in vettori
 * @param options - Opzioni (taskType, outputDimensionality)
 * @returns Array di vettori, uno per ogni testo (stesso ordine)
 */
export async function embedBatch(
  texts: string[],
  options?: EmbedOptions
): Promise<number[][]> {
  return getDefaultProvider().embedBatch(texts, options);
}

/**
 * Verifica se il servizio embedding è configurato (es. API key presente).
 */
export function isEmbeddingConfigured(): boolean {
  return getDefaultProvider().isConfigured();
}

/**
 * Servizio facciata per chi preferisce un oggetto invece delle funzioni.
 */
export class EmbeddingsService {
  constructor(private providerType: EmbeddingProviderType = "gemini") {}

  private get provider(): EmbeddingProvider {
    return getEmbeddingProvider(this.providerType);
  }

  get providerName(): string {
    return this.provider.name;
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  async embed(text: string, options?: EmbedOptions): Promise<number[]> {
    return this.provider.embed(text, options);
  }

  async embedBatch(texts: string[], options?: EmbedOptions): Promise<number[][]> {
    return this.provider.embedBatch(texts, options);
  }
}

export { getEmbeddingProvider };
