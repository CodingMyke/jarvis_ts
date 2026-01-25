/**
 * Rappresentazione di un evento del calendario.
 * Struttura indipendente dal provider (Google, Outlook, etc.)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  color?: string;
  isAllDay?: boolean;
}

/**
 * Opzioni per filtrare gli eventi.
 */
export interface GetEventsOptions {
  /** Data di inizio range (default: ora) */
  from?: Date;
  /** Data di fine range (default: +7 giorni) */
  to?: Date;
  /** Numero massimo di eventi da restituire */
  maxResults?: number;
}

/**
 * Risultato della chiamata per ottenere eventi.
 */
export interface GetEventsResult {
  events: CalendarEvent[];
  /** Range temporale effettivo della query */
  timeRange: {
    from: Date;
    to: Date;
  };
}

/**
 * Interfaccia per un provider di calendario.
 * Ogni implementazione (Google, Outlook, etc.) deve rispettare questo contratto.
 */
export interface CalendarProvider {
  /** Nome del provider per logging/debug */
  readonly name: string;

  /**
   * Ottiene gli eventi nel range specificato.
   */
  getEvents(options?: GetEventsOptions): Promise<GetEventsResult>;

  /**
   * Verifica se il provider è configurato correttamente.
   */
  isConfigured(): boolean;
}
