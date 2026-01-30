import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import { searchEpisodicMemoriesByContent } from "../functions";

const UNAUTHORIZED = { success: false as const, error: "UNAUTHORIZED", message: "Utente non autenticato" };

async function ensureAuth() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { authorized: false as const, supabase: null, userId: null };
  return { authorized: true as const, supabase: supabase as SupabaseClient<Database>, userId: user.id };
}

/**
 * POST: ricerca semantica nelle memorie episodiche.
 * Body: { query: string, match_count?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as { query?: string; match_count?: number };
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json(
        { success: false, error: "MISSING_QUERY", message: "Il parametro query è obbligatorio" },
        { status: 400 }
      );
    }
    const matchCount = typeof body?.match_count === "number" && body.match_count > 0 ? body.match_count : 5;

    const result = await searchEpisodicMemoriesByContent(auth.supabase, auth.userId, query, matchCount);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "EXECUTION_ERROR", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      memories: result.memories,
      count: result.memories.length,
    });
  } catch (error) {
    console.error("[POST /api/memory/episodic/search]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}
