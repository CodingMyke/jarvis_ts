import type { SystemToolDefinition } from "../types";

/**
 * Tool per eliminare definitivamente una o più chat dal database.
 * Può eliminare la chat corrente (senza parametri), una chat (chatId) o più chat in una volta (chatIds da listChats/searchChats).
 * L'assistente deve chiedere conferma in conversazione prima di chiamarlo.
 */
export const DELETE_CHAT_TOOL_NAME = "deleteChat";

function normalizeIds(args: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(args.chatIds)) {
    const ids = args.chatIds
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    if (ids.length > 0) return ids;
  }
  const single = typeof args.chatId === "string" ? args.chatId.trim() : undefined;
  if (single) return [single];
  return undefined;
}

export const deleteChatTool: SystemToolDefinition = {
  name: DELETE_CHAT_TOOL_NAME,

  description:
    "Elimina definitivamente una o più chat dal database (tutti i messaggi e la cronologia vengono rimossi). " +
    "Puoi eliminare: la chat corrente (non passare parametri); una chat (chatId); più chat in una volta (chatIds, id da listChats o searchChats). " +
    "Usa questo tool SOLO dopo aver chiesto conferma all'utente e aver ricevuto risposta positiva (es. sì, ok, elimina, conferma). " +
    "Non mostrare dialog di conferma: la conferma avviene in conversazione.",

  parameters: {
    type: "object",
    properties: {
      chatId: {
        type: "string",
        description:
          "ID di una singola chat da eliminare. Ometti (e usa chatIds per più chat o nessuno per la chat corrente).",
      },
      chatIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista di ID di chat da eliminare in una volta. Usa i chat_id restituiti da listChats o searchChats. Se passi chatIds ignora chatId.",
      },
    },
    required: [],
  },

  execute: async (args, context) => {
    const ids = normalizeIds(args);
    if (!ids || ids.length === 0) {
      const outcome = await context.deleteCurrentChat();
      if (outcome.success) {
        return { result: { success: true, message: "Chat eliminata definitivamente" } };
      }
      return { result: { success: false, error: outcome.error ?? "Eliminazione fallita" } };
    }
    if (!context.deleteChatById) {
      return { result: { success: false, error: "Eliminazione multipla non disponibile" } };
    }
    const results = await Promise.all(ids.map((id) => context.deleteChatById!(id)));
    const deleted = results
      .map((r, i) => (r.success ? ids[i] : null))
      .filter((id): id is string => id !== null);
    const failed = results
      .map((r, i) => (!r.success ? { id: ids[i], error: r.error ?? "Errore" } : null))
      .filter((x): x is { id: string; error: string } => x !== null);
    const allOk = failed.length === 0;
    return {
      result: allOk
        ? { success: true, message: "Chat eliminate definitivamente", deleted: deleted.length }
        : {
            success: failed.length < ids.length,
            message: `${deleted.length} eliminate, ${failed.length} fallite`,
            deleted: deleted.length,
            failed: failed.length ? failed : undefined,
          },
    };
  },
};
