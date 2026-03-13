import { ChatbotPageClient, JARVIS_CONFIG } from "@/app/_features/assistant";
import { AuthButton } from "@/app/_features/auth";
import { fetchCalendarEvents } from "@/app/_features/calendar";
import { fetchTasks, TodoProvider } from "@/app/_features/tasks";
import { Header } from "@/app/_shared";

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
    <>
      <Header title={JARVIS_CONFIG.assistantName}>
        <AuthButton />
      </Header>
      <TodoProvider initialTodos={initialTodos}>
        <ChatbotPageClient initialEvents={initialEvents} />
      </TodoProvider>
    </>
  );
}
