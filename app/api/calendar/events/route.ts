import { NextRequest } from "next/server";
import { jsonError } from "@/app/_server";
import {
  handleCreateCalendarEvent,
  handleDeleteCalendarEvent,
  handleGetCalendarEvents,
  handleUpdateCalendarEvent,
} from "@/app/_features/calendar";

export async function GET(request: NextRequest) {
  try {
    return await handleGetCalendarEvents(request.nextUrl.searchParams);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: `Si è verificato un errore nel leggere il calendario: ${errorMessage}`,
      events: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleCreateCalendarEvent(body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: `Si è verificato un errore durante la creazione dell'evento: ${errorMessage}`,
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleUpdateCalendarEvent(body);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: `Si è verificato un errore durante l'aggiornamento dell'evento: ${errorMessage}`,
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleDeleteCalendarEvent(request.nextUrl.searchParams);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: `Si è verificato un errore durante l'eliminazione dell'evento: ${errorMessage}`,
    });
  }
}
