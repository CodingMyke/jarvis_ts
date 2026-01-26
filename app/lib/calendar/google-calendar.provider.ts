import type {
  CalendarProvider,
  CalendarEvent,
  GetEventsOptions,
  GetEventsResult,
  CreateEventOptions,
  CreateEventResult,
} from "./types";
import { createMockEvents } from "./calendar.service";

/**
 * Configurazione per il provider Google Calendar.
 */
interface GoogleCalendarConfig {
  apiKey?: string;
  calendarId?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Cache per l'access token corrente.
 */
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Crea le date di default per il range di query.
 */
function createDefaultDateRange(): { from: Date; to: Date } {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);
  return { from, to };
}

/**
 * Mappa un evento Google Calendar al formato interno.
 */
function mapGoogleEventToCalendarEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  googleEvent: any
): CalendarEvent {
  const start = googleEvent.start?.dateTime || googleEvent.start?.date;
  const end = googleEvent.end?.dateTime || googleEvent.end?.date;
  const isAllDay = !googleEvent.start?.dateTime;

  return {
    id: googleEvent.id,
    title: googleEvent.summary || "Evento senza titolo",
    startTime: new Date(start),
    endTime: end ? new Date(end) : undefined,
    description: googleEvent.description,
    location: googleEvent.location,
    attendees: googleEvent.attendees?.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.displayName || a.email
    ),
    color: getGoogleEventColor(googleEvent.colorId),
    isAllDay,
  };
}

/**
 * Mappa i colorId di Google Calendar a colori hex.
 */
function getGoogleEventColor(colorId?: string): string {
  const colors: Record<string, string> = {
    "1": "#4285f4", // // Default Google Blue
    "2": "#33b679", // Sage
    "3": "#8e24aa", // Grape
    "4": "#e67c73", // Flamingo
    "5": "#f6c026", // Banana
    "6": "#f5511d", // Tangerine
    "7": "#7986cb", // Peacock
    "8": "#616161", // Graphite
    "9": "#3f51b5", // Blueberry
    "10": "#0b8043", // Basil
    "11": "#d60000", // Tomato
  };
  return colors[colorId || "1"]; 
}

/**
 * Mappa un colore hex a colorId di Google Calendar.
 * Se non corrisponde a nessun colore standard, restituisce undefined.
 */
function getGoogleColorIdFromHex(hex?: string): string | undefined {
  if (!hex) return undefined;
  
  const colorMap: Record<string, string> = {
    "#4285f4": "1", // Default Google Blue
    "#33b679": "2", // Sage
    "#8e24aa": "3", // Grape
    "#e67c73": "4", // Flamingo
    "#f6c026": "5", // Banana
    "#f5511d": "6", // Tangerine
    "#7986cb": "7", // Peacock
    "#616161": "8", // Graphite
    "#3f51b5": "9", // Blueberry
    "#0b8043": "10", // Basil
    "#d60000": "11", // Tomato
  };
  
  return colorMap[hex.toLowerCase()];
}

/**
 * Converte un CalendarEvent nel formato richiesto da Google Calendar API.
 */
function mapCalendarEventToGoogleEvent(
  options: CreateEventOptions
): Record<string, unknown> {
  const googleEvent: Record<string, unknown> = {
    summary: options.title,
  };

  // Gestione data/ora
  if (options.isAllDay) {
    // Evento tutto il giorno: usa solo la data (YYYY-MM-DD)
    const startDate = options.startTime.toISOString().split("T")[0];
    googleEvent.start = { date: startDate };
    
    if (options.endTime) {
      const endDate = options.endTime.toISOString().split("T")[0];
      googleEvent.end = { date: endDate };
    } else {
      // Se non specificato, usa il giorno successivo
      const nextDay = new Date(options.startTime);
      nextDay.setDate(nextDay.getDate() + 1);
      googleEvent.end = { date: nextDay.toISOString().split("T")[0] };
    }
  } else {
    // Evento con orario: usa dateTime (RFC3339)
    googleEvent.start = {
      dateTime: options.startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    
    if (options.endTime) {
      googleEvent.end = {
        dateTime: options.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      // Default: 1 ora dopo l'inizio
      const defaultEnd = new Date(options.startTime);
      defaultEnd.setHours(defaultEnd.getHours() + 1);
      googleEvent.end = {
        dateTime: defaultEnd.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
  }

  // Campi opzionali
  if (options.description) {
    googleEvent.description = options.description;
  }

  if (options.location) {
    googleEvent.location = options.location;
  }

  if (options.attendees && options.attendees.length > 0) {
    googleEvent.attendees = options.attendees.map((attendee) => {
      // Se contiene @, assumiamo sia un'email, altrimenti solo displayName
      if (attendee.includes("@")) {
        return { email: attendee };
      }
      return { displayName: attendee };
    });
  }

  const colorId = getGoogleColorIdFromHex(options.color);
  if (colorId) {
    googleEvent.colorId = colorId;
  }

  return googleEvent;
}

/**
 * Provider per Google Calendar.
 * Implementa l'interfaccia CalendarProvider.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "Google Calendar";
  private config: GoogleCalendarConfig;

  constructor(config: GoogleCalendarConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GOOGLE_CALENDAR_API_KEY,
      calendarId: config.calendarId || process.env.GOOGLE_CALENDAR_ID || "primary",
      accessToken: config.accessToken,
      refreshToken: config.refreshToken || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      clientId: config.clientId || process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    };
  }

  isConfigured(): boolean {
    // Supporta sia API key (per calendari pubblici) che OAuth (per calendari privati)
    return !!(
      this.config.apiKey ||
      this.config.accessToken ||
      (this.config.refreshToken && this.config.clientId && this.config.clientSecret)
    );
  }

  /**
   * Ottiene un access token valido, rinnovandolo se necessario usando il refresh token.
   */
  private async getValidAccessToken(): Promise<string | null> {
    // Se c'è un access token esplicito, usalo
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    // Se non c'è refresh token, non possiamo ottenere un token
    if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
      return null;
    }

    // Se abbiamo un token cached e non è scaduto, usalo
    if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
      return cachedAccessToken.token;
    }

    // Rinnova il token usando il refresh token
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          refresh_token: this.config.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[GoogleCalendarProvider] Errore refresh token:", errorText);
        return null;
      }

      const data = await response.json();
      const expiresIn = data.expires_in || 3600; // Default 1 ora

      cachedAccessToken = {
        token: data.access_token,
        expiresAt: Date.now() + (expiresIn - 300) * 1000, // Scade 5 minuti prima per sicurezza
      };

      return cachedAccessToken.token;
    } catch (error) {
      console.error("[GoogleCalendarProvider] Errore durante il refresh del token:", error);
      return null;
    }
  }

  async getEvents(options: GetEventsOptions = {}): Promise<GetEventsResult> {
    const { from, to } = createDefaultDateRange();
    const timeMin = options.from || from;
    const timeMax = options.to || to;
    const maxResults = options.maxResults || 50;

    // Se non è configurato, restituisci eventi vuoti
    if (!this.isConfigured()) {
      console.warn(
        "[GoogleCalendarProvider] Non configurato. " +
        "Per calendari pubblici: imposta GOOGLE_CALENDAR_API_KEY. " +
        "Per calendari privati: imposta GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET e GOOGLE_CALENDAR_REFRESH_TOKEN. " +
        "Vedi app/lib/calendar/GOOGLE_CALENDAR_SETUP.md per istruzioni."
      );
      return {
        events: [],
        timeRange: { from: timeMin, to: timeMax },
      };
    }

    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: maxResults.toString(),
        singleEvents: "true",
        orderBy: "startTime",
      });

      const headers: HeadersInit = {};
      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        this.config.calendarId!
      )}/events?${params}`;

      // Prova prima con OAuth (per calendari privati)
      const accessToken = await this.getValidAccessToken();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      } else if (this.config.apiKey) {
        // Fallback su API key (per calendari pubblici)
        url += `&key=${this.config.apiKey}`;
      } else {
        throw new Error("Nessun metodo di autenticazione disponibile");
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[GoogleCalendarProvider] Errore API:", response.status, errorBody);
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      const events = (data.items || []).map(mapGoogleEventToCalendarEvent);

      return {
        events,
        timeRange: { from: timeMin, to: timeMax },
      };
    } catch (error) {
      console.error("[GoogleCalendarProvider] Errore durante il fetch:", error);
      
      // Se il servizio è configurato ma c'è un errore, restituisci eventi vuoti invece di mock
      // per evitare confusione (gli eventi mock sono solo per sviluppo quando NON è configurato)
      // Questo permette al tool di comunicare l'errore all'assistente invece di mostrare eventi falsi
      console.warn(
        "[GoogleCalendarProvider] Errore nell'accesso a Google Calendar. " +
        "Restituisco eventi vuoti. Verifica la configurazione OAuth o API key."
      );
      
      return {
        events: [],
        timeRange: { from: timeMin, to: timeMax },
      };
    }
  }

  async createEvent(options: CreateEventOptions): Promise<CreateEventResult> {
    // Validazione base
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

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Google Calendar non è configurato correttamente",
        event: {
          id: "",
          title: options.title,
          startTime: options.startTime,
        },
      };
    }

    // Verifica che abbiamo OAuth (necessario per creare eventi)
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error: "Autenticazione OAuth richiesta per creare eventi. Configura GOOGLE_CALENDAR_REFRESH_TOKEN.",
        event: {
          id: "",
          title: options.title,
          startTime: options.startTime,
        },
      };
    }

    try {
      const googleEvent = mapCalendarEventToGoogleEvent(options);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        this.config.calendarId!
      )}/events`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("[GoogleCalendarProvider] Errore creazione evento:", response.status, errorBody);
        
        let errorMessage = `Errore durante la creazione dell'evento (${response.status})`;
        try {
          const errorData = JSON.parse(errorBody);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // Ignora errori di parsing
        }

        return {
          success: false,
          error: errorMessage,
          event: {
            id: "",
            title: options.title,
            startTime: options.startTime,
          },
        };
      }

      const createdEvent = await response.json();
      const calendarEvent = mapGoogleEventToCalendarEvent(createdEvent);

      return {
        success: true,
        event: calendarEvent,
      };
    } catch (error) {
      console.error("[GoogleCalendarProvider] Errore durante la creazione dell'evento:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Errore sconosciuto durante la creazione dell'evento",
        event: {
          id: "",
          title: options.title,
          startTime: options.startTime,
        },
      };
    }
  }
}
