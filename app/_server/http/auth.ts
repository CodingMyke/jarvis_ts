import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/app/_server/supabase/server";
import type { Database } from "@/app/_server/supabase/database.types";

export interface AuthContext {
  supabase: SupabaseClient<Database>;
  userId: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    supabase: supabase as SupabaseClient<Database>,
    userId: user.id,
  };
}
