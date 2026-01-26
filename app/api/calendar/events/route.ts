import { NextRequest, NextResponse } from "next/server";
import { getCalendarService } from "@/app/lib/calendar";

/**
 * API route per ottenere gli eventi del calendario.
 * Chiamata dai tool lato client che non hanno accesso alle variabili d'ambiente del server.
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

    return NextResponse.json({
      success: true,
      events,
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
