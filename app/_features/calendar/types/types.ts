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
 * Opzioni per creare un nuovo evento.
 */
export interface CreateEventOptions {
  /** Titolo dell'evento (obbligatorio) */
  title: string;
  /** Data e ora di inizio (obbligatorio) */
  startTime: Date;
  /** Data e ora di fine (opzionale) */
  endTime?: Date;
  /** Descrizione dell'evento */
  description?: string;
  /** Luogo dell'evento */
  location?: string;
  /** Lista di partecipanti (email o nomi) */
  attendees?: string[];
  /** Colore dell'evento (hex) */
  color?: string;
  /** Se true, l'evento dura tutto il giorno */
  isAllDay?: boolean;
}

/**
 * Risultato della creazione di un evento.
 */
export interface CreateEventResult {
  /** Evento creato con ID assegnato dal provider */
  event: CalendarEvent;
  /** Indica se l'operazione è riuscita */
  success: boolean;
  /** Messaggio di errore se success è false */
  error?: string;
}

/**
 * Opzioni per aggiornare un evento esistente.
 */
export interface UpdateEventOptions {
  /** ID dell'evento da aggiornare (obbligatorio) */
  eventId: string;
  /** Nuovo titolo dell'evento */
  title?: string;
  /** Nuova data e ora di inizio */
  startTime?: Date;
  /** Nuova data e ora di fine */
  endTime?: Date;
  /** Nuova descrizione dell'evento */
  description?: string;
  /** Nuovo luogo dell'evento */
  location?: string;
  /** Nuova lista di partecipanti (email o nomi) */
  attendees?: string[];
  /** Nuovo colore dell'evento (hex) */
  color?: string;
  /** Se true, l'evento dura tutto il giorno */
  isAllDay?: boolean;
}

/**
 * Risultato dell'aggiornamento di un evento.
 */
export interface UpdateEventResult {
  /** Evento aggiornato */
  event: CalendarEvent;
  /** Indica se l'operazione è riuscita */
  success: boolean;
  /** Messaggio di errore se success è false */
  error?: string;
}

/**
 * Risultato dell'eliminazione di un evento.
 */
export interface DeleteEventResult {
  /** Indica se l'operazione è riuscita */
  success: boolean;
  /** Messaggio di errore se success è false */
  error?: string;
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
   * Crea un nuovo evento nel calendario.
   */
  createEvent(options: CreateEventOptions): Promise<CreateEventResult>;

  /**
   * Aggiorna un evento esistente nel calendario.
   */
  updateEvent(options: UpdateEventOptions): Promise<UpdateEventResult>;

  /**
   * Elimina un evento dal calendario.
   */
  deleteEvent(eventId: string): Promise<DeleteEventResult>;

  /**
   * Verifica se il provider è configurato correttamente.
   */
  isConfigured(): boolean;
}
