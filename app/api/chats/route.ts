import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import type { Database } from "@/app/lib/supabase/database.types";
import {
  createChat,
  getChatById,
  getChats,
  searchChatsSemantic,
  appendToChat,
  deleteChat,
} from "./functions";
import type { CreateChatRequest, AppendChatRequest, ChatResponse } from "./model";
import type { ConversationTurn } from "@/app/lib/voice-chat/storage/types";

const UNAUTHORIZED = {
  success: false as const,
  error: "UNAUTHORIZED",
  message: "Utente non autenticato",
};

/** Formato UUID (8-4-4-4-12 hex). Usato per rifiutare id non validi e restituire 400 invece di 500. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensureAuth(): Promise<{
  authorized: boolean;
  supabase: SupabaseClient<Database> | null;
  userId: string | null;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { authorized: false, supabase: null, userId: null };
  }
  return {
    authorized: true,
    supabase: supabase as SupabaseClient<Database>,
    userId: user.id,
  };
}

function toChatResponse(row: {
  id: string;
  user_id: string;
  title: string | null;
  full_history: unknown;
  assistant_history: unknown;
  summary_text: string | null;
  last_activity_at: string;
  created_at: string;
}): ChatResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    full_history: Array.isArray(row.full_history) ? (row.full_history as ConversationTurn[]) : [],
    assistant_history: Array.isArray(row.assistant_history) ? (row.assistant_history as ConversationTurn[]) : [],
    summary_text: row.summary_text,
    last_activity_at: row.last_activity_at,
    created_at: row.created_at,
  };
}

/**
 * GET: ?id=uuid → singola chat; ?search=query → ricerca semantica; altrimenti lista.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    const search = request.nextUrl.searchParams.get("search");

    if (id?.trim()) {
      const idTrim = id.trim();
      if (!UUID_REGEX.test(idTrim)) {
        return NextResponse.json(
          { success: false, error: "INVALID_ID", message: "ID chat non valido. Usa il chat_id restituito da searchChats o listChats." },
          { status: 400 }
        );
      }
      const result = await getChatById(auth.supabase!, auth.userId!, idTrim);
      if (!result.success) {
        const status = result.error === "Chat non trovata" ? 404 : 500;
        return NextResponse.json(
          {
            success: false,
            error: result.error === "Chat non trovata" ? "NOT_FOUND" : "EXECUTION_ERROR",
            message: result.error,
          },
          { status }
        );
      }
      return NextResponse.json({
        success: true,
        chat: toChatResponse(result.chat),
      });
    }

    if (typeof search === "string" && search.trim()) {
      const limit = Math.min(
        Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 5),
        20
      );
      const result = await searchChatsSemantic(
        auth.supabase!,
        auth.userId!,
        search.trim(),
        limit
      );
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "EXECUTION_ERROR", message: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        matches: result.matches,
        count: result.matches.length,
      });
    }

    const result = await getChats(auth.supabase!, auth.userId!);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "EXECUTION_ERROR", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      chats: result.chats.map(toChatResponse),
      count: result.chats.length,
    });
  } catch (error) {
    console.error("[GET /api/chats]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}

/**
 * POST: crea una nuova chat.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    let body: CreateChatRequest = {};
    try {
      const raw = await request.json();
      body = typeof raw === "object" && raw !== null ? (raw as CreateChatRequest) : {};
    } catch {
      /* body opzionale */
    }

    const result = await createChat(auth.supabase!, auth.userId!, body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "CREATION_FAILED", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      chat: toChatResponse(result.chat),
    });
  } catch (error) {
    console.error("[POST /api/chats]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: append messaggi a una chat (body: { id, turns }).
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await ensureAuth();
    if (!auth.authorized) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const body = (await request.json()) as AppendChatRequest;
    if (!body.id?.trim()) {
      return NextResponse.json(
        { success: false, error: "MISSING_ID", message: "L'id della chat è obbligatorio" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.turns)) {
      return NextResponse.json(
        { success: false, error: "MISSING_TURNS", message: "Il campo turns (array) è obbligatorio" },
        { status: 400 }
      );
    }

    const result = await appendToChat(auth.supabase!, auth.userId!, {
      id: body.id.trim(),
      turns: body.turns,
    });

    if (!result.success) {
      const status = result.error === "Chat non trovata" ? 404 : 500;
      return NextResponse.json(
        {
          success: false,
          error: result.error === "Chat non trovata" ? "NOT_FOUND" : "UPDATE_FAILED",
          message: result.error,
        },
        { status }
      );
    }
    return NextResponse.json({
      success: true,
      chat: toChatResponse(result.chat),
    });
  } catch (error) {
    console.error("[PATCH /api/chats]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: elimina una chat. Query ?id=xxx oppure body { id: string }.
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

    const result = await deleteChat(auth.supabase!, auth.userId!, id.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "DELETE_FAILED", message: result.error },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, deleted: { id: id.trim() } });
  } catch (error) {
    console.error("[DELETE /api/chats]", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
