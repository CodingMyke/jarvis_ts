import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import { createSemanticMemory } from "./functions";
import type { CreateSemanticMemoryRequest } from "./model";

const UNAUTHORIZED = { success: false as const, error: "UNAUTHORIZED", message: "Utente non autenticato" };

/**
 * POST: scrive un record nella tabella semantic_memory.
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

    const body = (await request.json()) as CreateSemanticMemoryRequest;
    const result = await createSemanticMemory(
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
        key: result.memory.key,
        importance: result.memory.importance,
        user_id: result.memory.user_id,
        created_at: result.memory.created_at,
        updated_at: result.memory.updated_at,
      },
    });
  } catch (error) {
    console.error("[POST /api/memory/semantic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
