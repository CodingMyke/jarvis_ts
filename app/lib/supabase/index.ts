/**
 * Modulo Supabase / Database.
 *
 * - Server (RSC, Route Handlers, Server Actions): import { createClient } from "@/app/lib/supabase/server"
 * - Client (browser): import { createClient } from "@/app/lib/supabase/client"
 * - Config / provider: getSupabaseConfig, getDatabaseService, ecc. da questo index.
 */

export type { DatabaseProvider, SupabaseConfig } from "./types";
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
export { createClient as createServerClient } from "./server";
export { createClient as createBrowserClient } from "./client";
export { signInWithGoogle, signOut } from "./auth";
