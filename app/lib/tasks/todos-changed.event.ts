/**
 * Nome dell'evento custom emesso quando l'assistente (o un altro attore) modifica
 * la lista dei task. La UI (TodoContext) lo ascolta per rifare GET /api/tasks.
 */
export const TODOS_CHANGED_EVENT = "todos-changed";

/**
 * Notifica che la lista dei todo/task è stata modificata.
 * Da chiamare dopo create/update/delete eseguiti dall'assistente (tool).
 */
export function notifyTodosChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TODOS_CHANGED_EVENT));
  }
}
