/**
 * Parametri per la compattazione della conversazione.
 * assistant_history deve avere sempre al massimo SUMMARY_WINDOW_SIZE turni.
 * Se ce ne sono di più, si riassume la parte vecchia in un unico turno così che
 * il totale (riassunto + ultimi messaggi) sia <= SUMMARY_WINDOW_SIZE.
 */

export const SUMMARY_WINDOW_SIZE = 30;
