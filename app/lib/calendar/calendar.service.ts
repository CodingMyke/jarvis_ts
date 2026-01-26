import type {
  CalendarProvider,
  CalendarEvent,
  GetEventsOptions,
  GetEventsResult,
  CreateEventOptions,
  CreateEventResult,
  UpdateEventOptions,
  UpdateEventResult,
  DeleteEventResult,
} from "./types";
import { GoogleCalendarProvider } from "./google-calendar.provider";

/**
 * Tipo di provider supportati.
 */
export type CalendarProviderType = "google" | "mock";

/**
 * Crea eventi mock per testing/development.
 */
export function createMockEvents(): CalendarEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  return [
    {
      id: "mock-1",
      title: "Daily standup",
      startTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000), // 09:30
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
      color: "#4285f4",
      description: "Sincronizzazione giornaliera del team di sviluppo",
    },
    {
      id: "mock-2",
      title: "Pranzo con Marco per discutere del nuovo progetto di intelligenza artificiale",
      startTime: new Date(today.getTime() + 13 * 60 * 60 * 1000), // 13:00
      color: "#34a853",
      description: "Portare i documenti del contratto.",
      location: "Ristorante Da Luigi, Via Roma 42",
      attendees: ["Marco Rossi", "Giulia Bianchi"],
    },
    {
      id: "mock-3",
      title: "Review del progetto",
      startTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000), // 11:00
      endTime: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000), // 12:00
      color: "#ea4335",
      description: "Presentazione dello stato di avanzamento al product owner",
    },
    {
      id: "mock-4",
      title: "Call con cliente internazionale per la definizione dei requisiti della fase 2.",
      startTime: new Date(tomorrow.getTime() + 15.5 * 60 * 60 * 1000), // 15:30
      endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000), // 16:00
      color: "#fbbc04",
      description:
        "Link Zoom nel calendario. Preparare slides con mockup. Portare i documenti del contratto e assicurarsi che il cliente abbia ricevuto l'invito.",
      location: "Zoom Meeting",
      attendees: ["John Smith", "Sarah Johnson", "Marco Rossi"],
    },
    {
      id: "mock-5",
      title: "Palestra",
      startTime: new Date(tomorrow.getTime() + 19 * 60 * 60 * 1000), // 19:00
      color: "#9c27b0",
    },
    {
      id: "mock-6",
      title: "Dentista",
      startTime: new Date(dayAfter.getTime() + 10 * 60 * 60 * 1000), // 10:00
      color: "#00bcd4",
      description:
        "Controllo semestrale e pulizia dei denti. Ricordarsi di portare la tessera sanitaria.",
      location: "Studio Dentistico Bianchi",
    },
  ];
}

/**
 * Storage per eventi mock (per permettere update/delete).
 */
const mockEventsStorage = new Map<string, CalendarEvent>();

/**
 * Inizializza lo storage con eventi mock.
 */
function initializeMockEventsStorage() {
  if (mockEventsStorage.size === 0) {
    const mockEvents = createMockEvents();
    for (const event of mockEvents) {
      mockEventsStorage.set(event.id, event);
    }
  }
}

/**
 * Provider mock per testing/development.
 */
class MockCalendarProvider implements CalendarProvider {
  readonly name = "Mock Calendar";

  isConfigured(): boolean {
    return true;
  }

  async getEvents(options: GetEventsOptions = {}): Promise<GetEventsResult> {
    const from = options.from || new Date();
    const to = options.to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Simula un piccolo delay di rete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Inizializza lo storage se vuoto
    initializeMockEventsStorage();

    // Ottieni eventi dallo storage
    const allEvents = Array.from(mockEventsStorage.values());
    const events = allEvents.filter(
      (e) => e.startTime >= from && e.startTime <= to
    );

    return {
      events,
      timeRange: { from, to },
    };
  }

  async createEvent(options: CreateEventOptions): Promise<CreateEventResult> {
    // Simula un piccolo delay di rete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Valida il titolo
    if (!options.title || options.title.trim().length === 0) {
      return {
        success: false,
        error: "Il titolo dell'evento è obbligatorio",
        event: {
          id: "",
          title: "",
          startTime: options.startTime,
        },
      };
    }

    // Inizializza lo storage se vuoto
    initializeMockEventsStorage();

    // Crea un evento mock
    const mockEvent: CalendarEvent = {
      id: `mock-${Date.now()}`,
      title: options.title,
      startTime: options.startTime,
      endTime: options.endTime,
      description: options.description,
      location: options.location,
      attendees: options.attendees,
      color: options.color,
      isAllDay: options.isAllDay,
    };

    // Salva nello storage
    mockEventsStorage.set(mockEvent.id, mockEvent);

    return {
      success: true,
      event: mockEvent,
    };
  }

  async updateEvent(options: UpdateEventOptions): Promise<UpdateEventResult> {
    // Simula un piccolo delay di rete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Validazione base
    if (!options.eventId || options.eventId.trim().length === 0) {
      return {
        success: false,
        error: "L'ID dell'evento è obbligatorio",
        event: {
          id: "",
          title: "",
          startTime: new Date(),
        },
      };
    }

    // Inizializza lo storage se vuoto
    initializeMockEventsStorage();

    // Trova l'evento esistente
    const existingEvent = mockEventsStorage.get(options.eventId);
    if (!existingEvent) {
      return {
        success: false,
        error: "Evento non trovato",
        event: {
          id: options.eventId,
          title: "",
          startTime: new Date(),
        },
      };
    }

    // Aggiorna l'evento
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      title: options.title !== undefined ? options.title : existingEvent.title,
      startTime: options.startTime !== undefined ? options.startTime : existingEvent.startTime,
      endTime: options.endTime !== undefined ? options.endTime : existingEvent.endTime,
      description: options.description !== undefined ? options.description : existingEvent.description,
      location: options.location !== undefined ? options.location : existingEvent.location,
      attendees: options.attendees !== undefined ? options.attendees : existingEvent.attendees,
      color: options.color !== undefined ? options.color : existingEvent.color,
      isAllDay: options.isAllDay !== undefined ? options.isAllDay : existingEvent.isAllDay,
    };

    // Salva nello storage
    mockEventsStorage.set(options.eventId, updatedEvent);

    return {
      success: true,
      event: updatedEvent,
    };
  }

  async deleteEvent(eventId: string): Promise<DeleteEventResult> {
    // Simula un piccolo delay di rete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Validazione base
    if (!eventId || eventId.trim().length === 0) {
      return {
        success: false,
        error: "L'ID dell'evento è obbligatorio",
      };
    }

    // Inizializza lo storage se vuoto
    initializeMockEventsStorage();

    // Elimina l'evento
    const deleted = mockEventsStorage.delete(eventId);
    if (!deleted) {
      return {
        success: false,
        error: "Evento non trovato",
      };
    }

    return {
      success: true,
    };
  }
}

/**
 * Cache singleton dei provider.
 */
const providerCache = new Map<CalendarProviderType, CalendarProvider>();

/**
 * Crea o restituisce un provider dal cache.
 */
export function getCalendarProvider(
  type: CalendarProviderType = "google"
): CalendarProvider {
  if (!providerCache.has(type)) {
    switch (type) {
      case "google":
        providerCache.set(type, new GoogleCalendarProvider());
        break;
      case "mock":
        providerCache.set(type, new MockCalendarProvider());
        break;
      default:
        throw new Error(`Provider sconosciuto: ${type}`);
    }
  }
  return providerCache.get(type)!;
}

/**
 * Servizio principale per il calendario.
 * Facciata che nasconde i dettagli del provider.
 */
export class CalendarService {
  private provider: CalendarProvider;

  constructor(providerType: CalendarProviderType = "google") {
    this.provider = getCalendarProvider(providerType);
  }

  /**
   * Nome del provider attivo.
   */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Verifica se il servizio è configurato.
   */
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Ottiene gli eventi del calendario.
   */
  async getEvents(options?: GetEventsOptions): Promise<GetEventsResult> {
    return this.provider.getEvents(options);
  }

  /**
   * Ottiene gli eventi raggruppati per giorno.
   * Utile per la UI.
   */
  async getEventsGroupedByDay(
    options?: GetEventsOptions
  ): Promise<Map<string, CalendarEvent[]>> {
    const { events } = await this.getEvents(options);

    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dateKey = event.startTime.toISOString().split("T")[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    }

    return grouped;
  }

  /**
   * Crea un nuovo evento nel calendario.
   */
  async createEvent(options: CreateEventOptions): Promise<CreateEventResult> {
    return this.provider.createEvent(options);
  }

  /**
   * Aggiorna un evento esistente nel calendario.
   */
  async updateEvent(options: UpdateEventOptions): Promise<UpdateEventResult> {
    return this.provider.updateEvent(options);
  }

  /**
   * Elimina un evento dal calendario.
   */
  async deleteEvent(eventId: string): Promise<DeleteEventResult> {
    return this.provider.deleteEvent(eventId);
  }
}

/**
 * Istanza singleton del servizio.
 * Controlla sempre se Google è configurato per evitare di usare mock quando Google Calendar viene configurato dopo l'inizializzazione.
 */
let defaultService: CalendarService | null = null;

export function getCalendarService(): CalendarService {
  // Controlla sempre se Google è configurato, non solo alla prima creazione
  // Questo permette di usare Google Calendar anche se viene configurato dopo l'inizializzazione
  const googleProvider = getCalendarProvider("google");
  const providerType = googleProvider.isConfigured() ? "google" : "mock";
  
  // Ricrea il servizio se il provider type è cambiato (da mock a google)
  if (!defaultService || 
      (providerType === "google" && defaultService.providerName === "Mock Calendar")) {
    defaultService = new CalendarService(providerType);

    if (providerType === "mock") {
      console.info(
        "[CalendarService] Usando provider mock. Configura GOOGLE_CALENDAR_API_KEY o OAuth per usare Google Calendar."
      );
    } else {
      console.info(
        "[CalendarService] Usando provider Google Calendar."
      );
    }
  }

  return defaultService;
}
