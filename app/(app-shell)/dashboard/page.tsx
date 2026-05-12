import { fetchDashboardCalendarEvents } from "@/app/_features/calendar";
import { fetchDashboardTasks } from "@/app/_features/tasks";
import { DashboardCalendarTemplate, DashboardTodoTemplate } from "@/app/design";

export default async function DashboardPage() {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [
    { days, hasError: hasCalendarError },
    { todos, hasError: hasTasksError },
  ] = await Promise.all([
    fetchDashboardCalendarEvents({
      from: now,
      to: sevenDaysLater,
    }),
    fetchDashboardTasks(),
  ]);

  return (
    <div className="grid w-full grid-cols-4 items-start gap-6">
      <div className="col-span-1">
        <DashboardCalendarTemplate
          initialEvents={days}
          initialLoadError={hasCalendarError}
        />
      </div>
      <div className="col-span-1">
        <DashboardTodoTemplate
          initialTodos={todos}
          initialLoadError={hasTasksError}
        />
      </div>
    </div>
  );
}
