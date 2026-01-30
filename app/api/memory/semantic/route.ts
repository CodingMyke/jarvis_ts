import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import {
  createSemanticMemory,
  getSemanticMemories,
  getSemanticMemoryById,
  updateSemanticMemory,
  deleteSemanticMemory,
} from "./functions";
import type { CreateSemanticMemoryRequest, UpdateSemanticMemoryRequest } from "./model";

const UNAUTHORIZED = { success: false as const, error: "UNAUTHORIZED", message: "Utente non autenticato" };

function toMemoryResponse(m: {
  id: string;
  content: string;
  key: string | null;
  importance: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: m.id,
    content: m.content,
    key: m.key,
    importance: m.importance,
    user_id: m.user_id,
    created_at: m.created_at,
    updated_at: m.updated_at,
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
 * GET: legge record dalla tabella semantic_memory.
 * Senza query id: lista tutti i record dell'utente. Con ?id=xxx: singolo record.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const result = await getSemanticMemoryById(auth.supabase, auth.userId, id);
      if (!result.success) {
        const status = result.error === "Record non trovato" ? 404 : 500;
        return NextResponse.json(
          { success: false, error: result.error === "Record non trovato" ? "NOT_FOUND" : "EXECUTION_ERROR", message: result.error },
          { status }
        );
      }
      return NextResponse.json({ success: true, memory: toMemoryResponse(result.memory) });
    }

    const result = await getSemanticMemories(auth.supabase, auth.userId);
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
    console.error("[GET /api/memory/semantic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * POST: scrive un record nella tabella semantic_memory.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as CreateSemanticMemoryRequest;
    const result = await createSemanticMemory(auth.supabase, auth.userId, body);

    if (!result.success) {
      const status = result.error === "Il contenuto non può essere vuoto" ? 400 : 500;
      return NextResponse.json(
        { success: false, error: "CREATION_FAILED", message: result.error },
        { status }
      );
    }
    return NextResponse.json({ success: true, memory: toMemoryResponse(result.memory) });
  } catch (error) {
    console.error("[POST /api/memory/semantic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * PATCH: aggiorna un record nella tabella semantic_memory.
 * Body: { id: string, content?, key?, importance? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as UpdateSemanticMemoryRequest;
    if (!body.id?.trim()) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID", message: "L'id del record è obbligatorio" },
        { status: 400 }
      );
    }
    const { id, ...updates } = body;
    const result = await updateSemanticMemory(auth.supabase, auth.userId, id.trim(), updates);

    if (!result.success) {
      const status =
        result.error === "Record non trovato"
          ? 404
          : result.error === "Il contenuto non può essere vuoto"
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
    console.error("[PATCH /api/memory/semantic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}

/**
 * DELETE: elimina un record dalla tabella semantic_memory.
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

    const result = await deleteSemanticMemory(auth.supabase, auth.userId, id.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "DELETE_FAILED", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, deleted: { id: id.trim() } });
  } catch (error) {
    console.error("[DELETE /api/memory/semantic]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ success: false, error: "EXECUTION_ERROR", message }, { status: 500 });
  }
}
