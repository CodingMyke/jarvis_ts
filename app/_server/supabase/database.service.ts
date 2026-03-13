import type { DatabaseProvider } from "./types";
import { SupabaseProvider } from "./supabase.provider";

export type DatabaseProviderType = "supabase";

const providerCache = new Map<DatabaseProviderType, DatabaseProvider>();

function getDatabaseProvider(type: DatabaseProviderType = "supabase"): DatabaseProvider {
  if (!providerCache.has(type)) {
    switch (type) {
      case "supabase":
        providerCache.set(type, new SupabaseProvider());
        break;
      default:
        throw new Error(`Provider database sconosciuto: ${type}`);
    }
  }
  return providerCache.get(type)!;
}

/**
 * Servizio di accesso al database.
 * Espone funzioni di dominio (es. salvaRicordo, getRicordi) che internamente
 * usano il provider configurato. Per cambiare database basta sostituire
 * il provider e implementare le stesse operazioni.
 */
export class DatabaseService {
  private provider: DatabaseProvider;

  constructor(providerType: DatabaseProviderType = "supabase") {
    this.provider = getDatabaseProvider(providerType);
  }

  get providerName(): string {
    return this.provider.name;
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  // Qui andranno le funzioni di dominio, es.:
  // async salvaRicordo(...) { return this.provider... }
  // async getRicordi(...) { return this.provider... }
}

let defaultService: DatabaseService | null = null;

/**
 * Restituisce l'istanza singleton del DatabaseService.
 */
export function getDatabaseService(providerType: DatabaseProviderType = "supabase"): DatabaseService {
  if (!defaultService) {
    defaultService = new DatabaseService(providerType);
  }
  return defaultService;
}
