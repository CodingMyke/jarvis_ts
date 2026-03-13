import type { UIDayEvents } from "@/app/_features/calendar";
import { UpcomingEvents } from "@/app/_features/calendar";
import { TodoList } from "@/app/_features/tasks";
import { TimerDisplay } from "@/app/_features/timer";

interface AssistantPanelsProps {
  events: UIDayEvents[];
}

export function AssistantPanels({ events }: AssistantPanelsProps) {
  return (
    <>
      <TimerDisplay />
      <TodoList />

      <div className="flex items-start justify-between">
        <UpcomingEvents initialEvents={events} />
        <div className="w-24" />
      </div>
    </>
  );
}
