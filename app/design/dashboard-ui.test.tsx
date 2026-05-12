// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCalendarTemplate } from "@/app/design/templates/dashboard/DashboardCalendarTemplate";
import { DashboardTodoTemplate } from "@/app/design/templates/dashboard/DashboardTodoTemplate";
import { DashboardTodoPanel } from "@/app/design/organisms/tasks/DashboardTodoPanel";

const dashboardUiMocks = vi.hoisted(() => ({
  calendarWorkspace: {
    days: [] as Array<{
      dateISO: string;
      events: Array<{
        id: string;
        title: string;
        time: string;
      }>;
    }>,
    hasLoadError: false,
    onDeleteEvent: vi.fn(),
  },
  tasksWorkspace: {
    todos: [] as Array<{ id: string; text: string; completed: boolean }>,
    hasLoadError: false,
  },
  tasksState: {
    todos: [] as Array<{ id: string; text: string; completed: boolean }>,
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/app/design/templates/dashboard/useDashboardCalendarWorkspace", () => ({
  useDashboardCalendarWorkspace: () => dashboardUiMocks.calendarWorkspace,
}));

vi.mock("@/app/design/templates/dashboard/useDashboardTasksWorkspace", () => ({
  useDashboardTasksWorkspace: () => dashboardUiMocks.tasksWorkspace,
}));

vi.mock("@/app/design/organisms/calendar/CalendarPanel", () => ({
  CalendarPanel: ({ onDeleteEvent }: { onDeleteEvent?: (eventId: string) => Promise<unknown> }) => (
    <div data-testid="dashboard-calendar-panel" data-has-delete-handler={String(Boolean(onDeleteEvent))}>
      Calendar panel
    </div>
  ),
}));

vi.mock("@/app/_features/tasks/state/tasks.store", () => ({
  useTasksStore: (
    selector: (state: typeof dashboardUiMocks.tasksState) => unknown,
  ) => selector(dashboardUiMocks.tasksState),
}));

describe("dashboard design", () => {
  beforeEach(() => {
    dashboardUiMocks.calendarWorkspace = {
      days: [],
      hasLoadError: false,
      onDeleteEvent: vi.fn(),
    };
    dashboardUiMocks.tasksWorkspace = {
      todos: [],
      hasLoadError: false,
    };
    dashboardUiMocks.tasksState.todos = [];
    dashboardUiMocks.tasksState.update.mockReset();
    dashboardUiMocks.tasksState.remove.mockReset();
  });

  it("renders calendar panel when events are present", () => {
    dashboardUiMocks.calendarWorkspace = {
      days: [
        {
          dateISO: "2026-03-15",
          events: [{ id: "evt-1", title: "Standup", time: "10:00" }],
        },
      ],
      hasLoadError: true,
      onDeleteEvent: vi.fn(),
    };

    render(
      <DashboardCalendarTemplate
        initialEvents={[]}
        initialLoadError={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Eventi" })).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-calendar-panel")).toBeInTheDocument();
    expect(screen.queryByText("Si è verificato un errore")).not.toBeInTheDocument();
    expect(screen.queryByText("Nessun evento nei prossimi 7 giorni")).not.toBeInTheDocument();
  });

  it("renders empty state when there are no events and no error", () => {
    dashboardUiMocks.calendarWorkspace = {
      days: [],
      hasLoadError: false,
      onDeleteEvent: vi.fn(),
    };

    render(
      <DashboardCalendarTemplate
        initialEvents={[]}
        initialLoadError={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Eventi" })).toBeInTheDocument();
    expect(screen.getByText("Nessun evento nei prossimi 7 giorni")).toBeInTheDocument();
  });

  it("renders error state when there are no events and a load error", () => {
    dashboardUiMocks.calendarWorkspace = {
      days: [],
      hasLoadError: true,
      onDeleteEvent: vi.fn(),
    };

    render(
      <DashboardCalendarTemplate
        initialEvents={[]}
        initialLoadError={true}
      />,
    );

    expect(screen.getByRole("heading", { name: "Eventi" })).toBeInTheDocument();
    expect(screen.getByText("Si è verificato un errore")).toBeInTheDocument();
  });

  it("renders todo panel when todos are present and keeps only dashboard title", () => {
    dashboardUiMocks.tasksWorkspace = {
      todos: [
        { id: "todo-1", text: "Preparare la demo", completed: false },
        { id: "todo-2", text: "Inviare report", completed: true },
      ],
      hasLoadError: true,
    };
    dashboardUiMocks.tasksState.todos = [
      { id: "todo-1", text: "Preparare la demo", completed: false },
      { id: "todo-2", text: "Inviare report", completed: true },
    ];

    render(
      <DashboardTodoTemplate
        initialTodos={[]}
        initialLoadError={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "ToDo" })).toBeInTheDocument();
    expect(screen.getByText("Preparare la demo")).toBeInTheDocument();
    expect(screen.queryByText("Cose da fare")).not.toBeInTheDocument();
    expect(screen.queryByText("Si è verificato un errore")).not.toBeInTheDocument();
    expect(screen.queryByText("Non ci sono elementi")).not.toBeInTheDocument();
  });

  it("renders todo empty state when there are no tasks and no error", () => {
    dashboardUiMocks.tasksWorkspace = {
      todos: [],
      hasLoadError: false,
    };
    dashboardUiMocks.tasksState.todos = [];

    render(
      <DashboardTodoTemplate
        initialTodos={[]}
        initialLoadError={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "ToDo" })).toBeInTheDocument();
    expect(screen.getByText("Non ci sono elementi")).toBeInTheDocument();
  });

  it("renders todo error state when there are no tasks and loading failed", () => {
    dashboardUiMocks.tasksWorkspace = {
      todos: [],
      hasLoadError: true,
    };
    dashboardUiMocks.tasksState.todos = [];

    render(
      <DashboardTodoTemplate
        initialTodos={[]}
        initialLoadError={true}
      />,
    );

    expect(screen.getByRole("heading", { name: "ToDo" })).toBeInTheDocument();
    expect(screen.getByText("Si è verificato un errore")).toBeInTheDocument();
  });

  it("keeps todo interactions active in dashboard panel", () => {
    dashboardUiMocks.tasksState.todos = [
      { id: "todo-1", text: "Preparare la demo", completed: false },
      { id: "todo-2", text: "Inviare report", completed: true },
    ];

    render(<DashboardTodoPanel />);

    fireEvent.click(screen.getByLabelText("Segna come completato"));
    expect(dashboardUiMocks.tasksState.update).toHaveBeenCalledWith("todo-1", { completed: true });

    fireEvent.click(screen.getByLabelText("Segna come non completato"));
    expect(dashboardUiMocks.tasksState.update).toHaveBeenCalledWith("todo-2", { completed: false });

    fireEvent.click(screen.getAllByLabelText("Elimina todo")[0] as HTMLElement);
    expect(dashboardUiMocks.tasksState.remove).toHaveBeenCalledWith("todo-1");
  });
});
