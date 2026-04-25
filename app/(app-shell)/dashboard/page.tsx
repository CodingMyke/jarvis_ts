import { fetchDashboardCalendarEvents } from "@/app/_features/calendar";
import { DashboardCalendarTemplate } from "@/app/design";

export default async function DashboardPage() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { days, hasError } = await fetchDashboardCalendarEvents({
    from: now,
    to: sevenDaysLater,
  });

  return (
    <DashboardCalendarTemplate
      initialEvents={days}
      initialLoadError={hasError}
    />
  );
}
