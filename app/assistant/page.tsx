import { AssistantWorkspaceTemplate } from "@/app/design";
import { fetchCalendarEvents } from "@/app/_features/calendar";
import { fetchTasks } from "@/app/_features/tasks";

/**
 * Pagina assistente (protetta). Solo utenti loggati possono accedere.
 * Eventi e task sono caricati lato server alla prima richiesta (come per il calendario).
 */
export default async function AssistantPage() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [initialEvents, initialTodos] = await Promise.all([
    fetchCalendarEvents({ from: now, to: sevenDaysLater }),
    fetchTasks(),
  ]);

  return (
    <AssistantWorkspaceTemplate
      initialEvents={initialEvents}
      initialTodos={initialTodos}
    />
  );
}
