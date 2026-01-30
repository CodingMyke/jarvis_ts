import { Header } from "@/app/components/organisms";
import { AuthButton } from "@/app/components/molecules";
import { ChatbotPageClient } from "@/app/components/organisms/ChatbotPageClient";
import { fetchCalendarEvents } from "@/app/lib/calendar/actions";
import { JARVIS_CONFIG } from "@/app/lib/voice-chat/jarvis.config";

/**
 * Pagina assistente (protetta). Solo utenti loggati possono accedere.
 */
export default async function AssistantPage() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const initialEvents = await fetchCalendarEvents({
    from: now,
    to: sevenDaysLater,
  });

  return (
    <>
      <Header title={JARVIS_CONFIG.assistantName}>
        <AuthButton />
      </Header>
      <ChatbotPageClient initialEvents={initialEvents} />
    </>
  );
}
