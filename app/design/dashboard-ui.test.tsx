// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardCalendarTemplate } from "@/app/design/templates/dashboard/DashboardCalendarTemplate";

const dashboardUiMocks = vi.hoisted(() => ({
  workspace: {
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
}));

vi.mock("@/app/design/templates/dashboard/useDashboardCalendarWorkspace", () => ({
  useDashboardCalendarWorkspace: () => dashboardUiMocks.workspace,
}));

vi.mock("@/app/design/organisms/calendar/CalendarPanel", () => ({
  CalendarPanel: ({ onDeleteEvent }: { onDeleteEvent?: (eventId: string) => Promise<unknown> }) => (
    <div data-testid="dashboard-calendar-panel" data-has-delete-handler={String(Boolean(onDeleteEvent))}>
      Calendar panel
    </div>
  ),
}));

describe("dashboard design", () => {
  beforeEach(() => {
    dashboardUiMocks.workspace = {
      days: [],
      hasLoadError: false,
      onDeleteEvent: vi.fn(),
    };
  });

  it("renders calendar panel when events are present", () => {
    dashboardUiMocks.workspace = {
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
    dashboardUiMocks.workspace = {
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
    dashboardUiMocks.workspace = {
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
});
