import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  getChatsUnauthorizedResponse,
  handleAppendChat,
  handleCreateChat,
  handleDeleteChat,
  handleGetChats,
} from "@/app/_features/chats";

async function withAuth() {
  const auth = await getAuthContext();
  return auth ?? getChatsUnauthorizedResponse();
}

export async function GET(request: NextRequest) {
  try {
    const authOrResponse = await withAuth();
    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    return await handleGetChats(authOrResponse, request.nextUrl.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authOrResponse = await withAuth();
    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    return await handleCreateChat(authOrResponse, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message,
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authOrResponse = await withAuth();
    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    const body = await request.json();
    return await handleAppendChat(authOrResponse, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message,
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authOrResponse = await withAuth();
    if (authOrResponse instanceof Response) {
      return authOrResponse;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    return await handleDeleteChat(authOrResponse, body, request.nextUrl.searchParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message,
    });
  }
}
