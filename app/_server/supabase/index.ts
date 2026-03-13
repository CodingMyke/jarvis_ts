export type { DatabaseProvider, SupabaseConfig } from "./types";
export type { Database, Json } from "./database.types";
export { SupabaseProvider } from "./supabase.provider";
export {
  getSupabaseConfig,
  createSupabaseClient,
  getSupabaseClient,
} from "./supabase.client";
export {
  DatabaseService,
  getDatabaseService,
  type DatabaseProviderType,
} from "./database.service";
export { createClient } from "./server";
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
