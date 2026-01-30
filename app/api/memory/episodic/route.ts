import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import {
  createEpisodicMemory,
  getEpisodicMemories,
  getEpisodicMemoryById,
  updateEpisodicMemory,
  deleteEpisodicMemory,
} from "./functions";
import type { CreateEpisodicMemoryRequest, EpisodicMemoryResponse, UpdateEpisodicMemoryRequest } from "./model";

const UNAUTHORIZED = { success: false as const, error: "UNAUTHORIZED", message: "Utente non autenticato" };

function toMemoryResponse(m: EpisodicMemoryResponse): EpisodicMemoryResponse {
  return {
    id: m.id,
    content: m.content,
    importance: m.importance,
    metadata: m.metadata,
    ttl_days: m.ttl_days,
    user_id: m.user_id,
    created_at: m.created_at,
  };
}

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
 * GET: legge record dalla tabella episodic_memory.
 * Senza query id: lista tutti i record dell'utente. Con ?id=xxx: singolo record.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const result = await getEpisodicMemoryById(auth.supabase, auth.userId, id);
      if (!result.success) {
        const status = result.error === "Record non trovato" ? 404 : 500;
        return NextResponse.json(
          { success: false, error: result.error === "Record non trovato" ? "NOT_FOUND" : "EXECUTION_ERROR", message: result.error },
          { status }
        );
      }
      return NextResponse.json({ success: true, memory: toMemoryResponse(result.memory) });
    }

    const result = await getEpisodicMemories(auth.supabase, auth.userId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "EXECUTION_ERROR", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      memories: result.memories.map(toMemoryResponse),
      count: result.memories.length,
    });
  } catch (error) {
    console.error("[GET /api/memory/episodic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * POST: scrive un record nella tabella episodic_memory.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as CreateEpisodicMemoryRequest;
    const result = await createEpisodicMemory(auth.supabase, auth.userId, body);

    if (!result.success) {
      const status = result.error === "Il contenuto non può essere vuoto" ? 400 : 500;
      return NextResponse.json(
        { success: false, error: "CREATION_FAILED", message: result.error },
        { status }
      );
    }
    return NextResponse.json({ success: true, memory: toMemoryResponse(result.memory) });
  } catch (error) {
    console.error("[POST /api/memory/episodic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * PATCH: aggiorna un record nella tabella episodic_memory.
 * Body: { id: string, content?, importance?, metadata?, ttl_days? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as UpdateEpisodicMemoryRequest;
    if (!body.id?.trim()) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID", message: "L'id del record è obbligatorio" },
        { status: 400 }
      );
    }
    const { id, ...updates } = body;
    const result = await updateEpisodicMemory(auth.supabase, auth.userId, id.trim(), updates);

    if (!result.success) {
      const status =
        result.error === "Record non trovato"
          ? 404
          : result.error === "Il contenuto non può essere vuoto" || result.error === "Nessun campo da aggiornare"
            ? 400
            : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error === "Record non trovato" ? "NOT_FOUND" : "UPDATE_FAILED",
          message: result.error,
        },
        { status }
      );
    }
    return NextResponse.json({ success: true, memory: toMemoryResponse(result.memory) });
  } catch (error) {
    console.error("[PATCH /api/memory/episodic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * DELETE: elimina un record dalla tabella episodic_memory.
 * Query ?id=xxx oppure body { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    let id = request.nextUrl.searchParams.get("id");
    if (!id) {
      try {
        const body = (await request.json()) as { id?: string };
        id = body?.id ?? null;
      } catch {
        /* no body */
      }
    }
    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID", message: "Fornire id in query (?id=) o nel body" },
        { status: 400 }
      );
    }

    const result = await deleteEpisodicMemory(auth.supabase, auth.userId, id.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "DELETE_FAILED", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, deleted: { id: id.trim() } });
  } catch (error) {
    console.error("[DELETE /api/memory/episodic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}
