import { Header, TodoProvider } from "@/app/components/organisms";
import { AuthButton } from "@/app/components/molecules";
import { ChatbotPageClient } from "@/app/components/organisms/ChatbotPageClient";
import { fetchCalendarEvents } from "@/app/lib/calendar/actions";
import { fetchTasks } from "@/app/lib/tasks";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

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
