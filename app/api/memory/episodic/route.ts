import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import { createEpisodicMemory } from "./functions";
import type { CreateEpisodicMemoryRequest } from "./model";

const UNAUTHORIZED = { success: false as const, error: "UNAUTHORIZED", message: "Utente non autenticato" };

/**
 * POST: scrive un record nella tabella episodic_memory.
 * Richiede utente autenticato su Supabase.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(UNAUTHORIZED, { status: 401 });
    }

    const body = (await request.json()) as CreateEpisodicMemoryRequest;
    const result = await createEpisodicMemory(
      supabase as SupabaseClient<Database>,
      user.id,
      body
    );

    if (!result.success) {
      const status = result.error === "Il contenuto non può essere vuoto" ? 400 : 500;
      return NextResponse.json(
        { success: false, error: "CREATION_FAILED", message: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      memory: {
        id: result.memory.id,
        content: result.memory.content,
        importance: result.memory.importance,
        metadata: result.memory.metadata,
        ttl_days: result.memory.ttl_days,
        user_id: result.memory.user_id,
        created_at: result.memory.created_at,
      },
    });
  } catch (error) {
    console.error("[POST /api/memory/episodic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
