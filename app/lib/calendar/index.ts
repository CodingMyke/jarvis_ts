/**
 * Modulo Calendar - Gestione eventi calendario.
 *
 * Esporta:
 * - Tipi per eventi e provider
 * - Servizio principale (CalendarService)
 * - Provider Google Calendar
 */

// Tipi
export type {
  CalendarEvent,
  GetEventsOptions,
  GetEventsResult,
  CreateEventOptions,
  CreateEventResult,
  CalendarProvider,
} from "./types";

// Provider
export { GoogleCalendarProvider } from "./google-calendar.provider";

// Servizio
export {
  CalendarService,
  getCalendarService,
  getCalendarProvider,
  type CalendarProviderType,
} from "./calendar.service";
