import { ChatbotPageClient } from "@/app/components/organisms/ChatbotPageClient";
import { fetchCalendarEvents } from "@/app/lib/calendar/actions";

/**
 * Page principale - Server Component.
 * Fa il fetch degli eventi in SSR e li passa al client.
 */
export default async function ChatbotPage() {
  // Fetch eventi calendario lato server (SSR)
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const initialEvents = await fetchCalendarEvents({
    from: now,
    to: sevenDaysLater, // 7 giorni
  });

  return <ChatbotPageClient initialEvents={initialEvents} />;
}
