import { NextRequest, NextResponse } from "next/server";
import { getCalendarService } from "@/app/lib/calendar";
import type { CreateEventOptions, UpdateEventOptions } from "@/app/lib/calendar/types";

/**
 * Formatta una data in formato ISO con il fuso orario locale (CET).
 * Questo assicura che gli orari siano sempre nel fuso orario dell'utente.
 */
function formatDateWithLocalTimezone(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  
  // Calcola l'offset del fuso orario in formato ±HH:mm
  const offset = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? "+" : "-";
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

/**
 * API route per gestire gli eventi del calendario.
 * Chiamata dai tool lato client che non hanno accesso alle variabili d'ambiente del server.
 */

/**
 * GET: Ottiene gli eventi del calendario.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse date parameters
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const daysAheadParam = searchParams.get("daysAhead");
    
    let from: Date;
    let to: Date;
    
    if (daysAheadParam) {
      // Se viene passato daysAhead, calcola il range da oggi
      const daysAhead = parseInt(daysAheadParam, 10);
      from = new Date();
      to = new Date();
      to.setDate(to.getDate() + daysAhead);
    } else if (fromParam && toParam) {
      // Se vengono passate date esplicite
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      // Default: 7 giorni da oggi
      from = new Date();
      to = new Date();
      to.setDate(to.getDate() + 7);
    }

    const service = getCalendarService();
    
    // Verifica se il servizio è configurato
    if (!service.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: "Il calendario non è configurato. Configura Google Calendar per vedere i tuoi eventi.",
          error: "CALENDAR_NOT_CONFIGURED",
          events: [],
        },
        { status: 200 } // Status 200 perché non è un errore HTTP, ma un errore di configurazione
      );
    }

    const { events } = await service.getEvents({ from, to });

    // Serializza gli eventi per la risposta con date in formato locale (CET)
    // Questo assicura che gli orari siano sempre nel fuso orario dell'utente
    const serializedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      startTime: formatDateWithLocalTimezone(event.startTime),
      endTime: event.endTime ? formatDateWithLocalTimezone(event.endTime) : undefined,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      color: event.color,
      isAllDay: event.isAllDay,
    }));

    return NextResponse.json({
      success: true,
      events: serializedEvents,
      eventCount: events.length,
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/calendar/events] Errore:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    
    return NextResponse.json(
      {
        success: false,
        message: `Si è verificato un errore nel leggere il calendario: ${errorMessage}. Verifica la configurazione di Google Calendar.`,
        error: errorMessage,
        events: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Crea un nuovo evento nel calendario.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validazione base
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_TITLE",
          errorMessage: "Il titolo dell'evento è obbligatorio",
        },
        { status: 400 }
      );
    }

    if (body.title.trim().length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "TITLE_TOO_LONG",
          errorMessage: "Il titolo dell'evento non può superare i 500 caratteri",
        },
        { status: 400 }
      );
    }

    // Parse date
    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const endTime = body.endTime ? new Date(body.endTime) : undefined;

    // Validazione date
    if (endTime && endTime < startTime) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_DATES",
          errorMessage: "La data di fine deve essere successiva alla data di inizio",
        },
        { status: 400 }
      );
    }

    const service = getCalendarService();
    
    // Verifica se il servizio è configurato
    if (!service.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "CALENDAR_NOT_CONFIGURED",
          errorMessage: "Il calendario non è configurato. Configura Google Calendar per creare eventi.",
        },
        { status: 200 } // Status 200 perché non è un errore HTTP, ma un errore di configurazione
      );
    }

    // Prepara le opzioni per creare l'evento
    const createOptions: CreateEventOptions = {
      title: body.title.trim(),
      startTime,
      endTime,
      description: body.description?.trim(),
      location: body.location?.trim(),
      attendees: body.attendees,
      color: body.color,
      isAllDay: body.isAllDay || false,
    };

    const result = await service.createEvent(createOptions);

    if (!result.success) {
      // Se è un errore di refresh token scaduto, restituisci 401
      const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
      return NextResponse.json(
        {
          success: false,
          error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "CREATION_FAILED",
          errorMessage: result.error || "Errore durante la creazione dell'evento",
        },
        { status: isTokenExpired ? 401 : 500 }
      );
    }

    // Serializza l'evento per la risposta (converte Date in ISO string)
    const event = result.event;
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString(),
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        color: event.color,
        isAllDay: event.isAllDay,
      },
    });
  } catch (error) {
    console.error("[POST /api/calendar/events] Errore:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    
    return NextResponse.json(
      {
        success: false,
        error: "EXECUTION_ERROR",
        errorMessage: `Si è verificato un errore durante la creazione dell'evento: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Aggiorna un evento esistente nel calendario.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validazione base
    if (!body.eventId || typeof body.eventId !== "string" || body.eventId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_EVENT_ID",
          errorMessage: "L'ID dell'evento è obbligatorio",
        },
        { status: 400 }
      );
    }

    if (body.title !== undefined && body.title.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_TITLE",
          errorMessage: "Il titolo dell'evento non può essere vuoto",
        },
        { status: 400 }
      );
    }

    if (body.title && body.title.trim().length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "TITLE_TOO_LONG",
          errorMessage: "Il titolo dell'evento non può superare i 500 caratteri",
        },
        { status: 400 }
      );
    }

    // Parse date se presenti
    const startTime = body.startTime ? new Date(body.startTime) : undefined;
    const endTime = body.endTime ? new Date(body.endTime) : undefined;

    // Validazione date
    if (startTime && endTime && endTime < startTime) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_DATES",
          errorMessage: "La data di fine deve essere successiva alla data di inizio",
        },
        { status: 400 }
      );
    }

    const service = getCalendarService();
    
    // Verifica se il servizio è configurato
    if (!service.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "CALENDAR_NOT_CONFIGURED",
          errorMessage: "Il calendario non è configurato. Configura Google Calendar per aggiornare eventi.",
        },
        { status: 200 } // Status 200 perché non è un errore HTTP, ma un errore di configurazione
      );
    }

    // Prepara le opzioni per aggiornare l'evento
    const updateOptions: UpdateEventOptions = {
      eventId: body.eventId.trim(),
      title: body.title?.trim(),
      startTime,
      endTime,
      description: body.description?.trim(),
      location: body.location?.trim(),
      attendees: body.attendees,
      color: body.color,
      isAllDay: body.isAllDay,
    };

    const result = await service.updateEvent(updateOptions);

    if (!result.success) {
      // Se è un errore di refresh token scaduto, restituisci 401
      const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
      return NextResponse.json(
        {
          success: false,
          error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "UPDATE_FAILED",
          errorMessage: result.error || "Errore durante l'aggiornamento dell'evento",
        },
        { status: isTokenExpired ? 401 : 500 }
      );
    }

    // Serializza l'evento per la risposta (converte Date in ISO string)
    const event = result.event;
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString(),
        description: event.description,
        location: event.location,
        attendees: event.attendees,
        color: event.color,
        isAllDay: event.isAllDay,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/calendar/events] Errore:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    
    return NextResponse.json(
      {
        success: false,
        error: "EXECUTION_ERROR",
        errorMessage: `Si è verificato un errore durante l'aggiornamento dell'evento: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Elimina un evento dal calendario.
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get("eventId");
    
    // Validazione base
    if (!eventId || eventId.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_EVENT_ID",
          errorMessage: "L'ID dell'evento è obbligatorio. Usa ?eventId=<id> nella query string.",
        },
        { status: 400 }
      );
    }

    const service = getCalendarService();
    
    // Verifica se il servizio è configurato
    if (!service.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "CALENDAR_NOT_CONFIGURED",
          errorMessage: "Il calendario non è configurato. Configura Google Calendar per eliminare eventi.",
        },
        { status: 200 } // Status 200 perché non è un errore HTTP, ma un errore di configurazione
      );
    }

    const result = await service.deleteEvent(eventId.trim());

    if (!result.success) {
      // Se è un errore di refresh token scaduto, restituisci 401
      const isTokenExpired = result.error?.includes("REFRESH_TOKEN_EXPIRED");
      return NextResponse.json(
        {
          success: false,
          error: isTokenExpired ? "REFRESH_TOKEN_EXPIRED" : "DELETE_FAILED",
          errorMessage: result.error || "Errore durante l'eliminazione dell'evento",
        },
        { status: isTokenExpired ? 401 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Evento eliminato con successo",
    });
  } catch (error) {
    console.error("[DELETE /api/calendar/events] Errore:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    
    return NextResponse.json(
      {
        success: false,
        error: "EXECUTION_ERROR",
        errorMessage: `Si è verificato un errore durante l'eliminazione dell'evento: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
