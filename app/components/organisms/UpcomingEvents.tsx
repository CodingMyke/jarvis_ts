import { DayEvents, type DayEventsData } from "@/app/components/molecules/DayEvents";
import type { CalendarEvent } from "@/app/components/atoms/EventItem";

// Fake data per testing UI
function useFakeEvents(): DayEventsData[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const fakeEvents: DayEventsData[] = [
    {
      date: today,
      events: [
        {
          id: "1",
          title: "Daily standup",
          time: "09:30",
          endTime: "10:00",
          color: "#4285f4",
          description: "Sincronizzazione giornaliera del team di sviluppo",
        },
        {
          id: "2",
          title: "Pranzo con Marco per discutere del nuovo progetto di intelligenza artificiale",
          time: "13:00",
          color: "#34a853",
          description: "Ristorante Da Luigi, Via Roma 42. Portare i documenti del contratto.",
        },
      ],
    },
    {
      date: tomorrow,
      events: [
        {
          id: "3",
          title: "Review del progetto",
          time: "11:00",
          endTime: "12:00",
          color: "#ea4335",
          description: "Presentazione dello stato di avanzamento al product owner",
        },
        {
          id: "4",
          title: "Call con cliente internazionale per la definizione dei requisiti della fase 2",
          time: "15:30",
          endTime: "16:00",
          color: "#fbbc04",
          description: "Link Zoom nel calendario. Preparare slides con mockup.",
        },
        {
          id: "5",
          title: "Palestra",
          time: "19:00",
          color: "#9c27b0",
        },
      ],
    },
    {
      date: dayAfter,
      events: [
        {
          id: "6",
          title: "Dentista",
          time: "10:00",
          color: "#00bcd4",
          description: "Controllo semestrale e pulizia",
        },
      ],
    },
  ];

  // Filtra solo i giorni con eventi
  return fakeEvents.filter((day) => day.events.length > 0);
}

export function UpcomingEvents() {
  const days = useFakeEvents();

  if (days.length === 0) return null;

  return (
    <div className="mt-12 max-w-xs space-y-4">
      {days.map((dayData) => (
        <DayEvents key={dayData.date.toISOString()} data={dayData} />
      ))}
    </div>
  );
}
