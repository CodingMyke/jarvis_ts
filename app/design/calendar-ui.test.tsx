// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarDayGroup } from "@/app/design/organisms/calendar/CalendarDayGroup";
import { CalendarPanel } from "@/app/design/organisms/calendar/CalendarPanel";
import { CalendarPanelProvider } from "@/app/design/organisms/calendar/CalendarPanelContext";
import { useCalendarEventCardInteractions } from "@/app/design/organisms/calendar/useCalendarEventCardInteractions";
import { useCalendarPanelContext } from "@/app/design/organisms/calendar/useCalendarPanelContext";
import { useCalendarPanelScroll } from "@/app/design/organisms/calendar/useCalendarPanelScroll";

const calendarUiMocks = vi.hoisted(() => ({
  days: [] as Array<{
    dateISO: string;
    dayLabel: string;
    events: Array<{
      id: string;
      title: string;
      time: string;
      endTime?: string;
      description?: string;
      location?: string;
      attendees?: string[];
      color?: string;
    }>;
  }>,
}));

vi.mock("@/app/_features/calendar/state/calendar.store", () => ({
  useCalendarStore: (
    selector: (state: { days: typeof calendarUiMocks.days }) => unknown,
  ) => selector({ days: calendarUiMocks.days }),
}));

function ContextProbe() {
  const { collapseEvent, toggleEvent, visibleExpandedEventId } = useCalendarPanelContext();

  return (
    <div>
      <span>{visibleExpandedEventId ?? "none"}</span>
      <button onClick={() => toggleEvent("evt-1")}>toggle</button>
      <button onClick={() => collapseEvent("evt-1")}>collapse</button>
    </div>
  );
}

function InteractionsProbe({
  isDeleteDialogVisible = false,
  isExpanded = true,
  onToggle,
}: {
  isDeleteDialogVisible?: boolean;
  isExpanded?: boolean;
  onToggle: (eventId: string) => void;
}) {
  const {
    containerRef,
    handleClick,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
  } = useCalendarEventCardInteractions("evt-1", isExpanded, isDeleteDialogVisible, onToggle);

  return (
    <div
      ref={containerRef}
      className="event-item-container"
      data-testid="event-card"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
    />
  );
}

function ScrollProbe({ expandedEventId }: { expandedEventId: string | null }) {
  const { containerRef, contentRef, scrollOffset } = useCalendarPanelScroll(expandedEventId);

  return (
    <div ref={containerRef} data-role="container">
      <div ref={contentRef}>
        <div data-event-id="evt-2">evento</div>
      </div>
      <span>{scrollOffset}</span>
    </div>
  );
}

function ProviderWrapper({
  children,
  days,
}: {
  children: ReactNode;
  days: typeof calendarUiMocks.days;
}) {
  return <CalendarPanelProvider days={days}>{children}</CalendarPanelProvider>;
}

describe("calendar design", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00+01:00"));
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0)),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => window.clearTimeout(frameId)),
    );

    calendarUiMocks.days = [
      {
        dateISO: new Date().toISOString(),
        dayLabel: "Oggi",
        events: [
          {
            id: "evt-1",
            title: "Standup",
            time: "10:00",
            endTime: "10:30",
            description: "Allineamento giornaliero",
            location: "Sala riunioni",
            attendees: ["team@example.com"],
            color: "#00f0ff",
          },
        ],
      },
    ];

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 460,
    });
  });

  it("throws outside the provider and keeps the visible event id in sync with available days", () => {
    expect(() => renderHook(() => useCalendarPanelContext())).toThrow(
      "useCalendarPanelContext must be used within CalendarPanelProvider",
    );

    const { rerender } = render(
      <ProviderWrapper days={calendarUiMocks.days}>
        <ContextProbe />
      </ProviderWrapper>,
    );

    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByText("evt-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("collapse"));
    expect(screen.getByText("none")).toBeInTheDocument();

    fireEvent.click(screen.getByText("toggle"));
    rerender(
      <ProviderWrapper days={[]}>
        <ContextProbe />
      </ProviderWrapper>,
    );

    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("tracks press state, toggles on click and closes an expanded card on outside clicks", async () => {
    const onToggle = vi.fn();
    render(<InteractionsProbe onToggle={onToggle} />);

    const card = screen.getByTestId("event-card");

    fireEvent.mouseDown(card);
    expect(card).toHaveClass("event-pressed");

    fireEvent.mouseLeave(card);
    expect(card).not.toHaveClass("event-pressed");

    fireEvent.mouseUp(card);
    fireEvent.click(card);
    expect(onToggle).toHaveBeenCalledWith("evt-1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    fireEvent.mouseDown(document.body);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("computes the panel scroll offset when the expanded event would overflow the viewport", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getBoundingClientRect(this: HTMLElement) {
        if (this.dataset.role === "container") {
          return {
            top: 100,
            bottom: 400,
            left: 0,
            right: 0,
            width: 300,
            height: 300,
            x: 0,
            y: 100,
            toJSON: () => ({}),
          };
        }

        if (this.dataset.eventId === "evt-2") {
          return {
            top: 320,
            bottom: 400,
            left: 0,
            right: 0,
            width: 300,
            height: 80,
            x: 0,
            y: 320,
            toJSON: () => ({}),
          };
        }

        return {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      });

    const { rerender } = render(<ScrollProbe expandedEventId={null} />);
    expect(screen.getByText("0")).toBeInTheDocument();

    rerender(<ScrollProbe expandedEventId="evt-2" />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    expect(screen.getByText("120")).toBeInTheDocument();

    rectSpy.mockRestore();
  });

  it("renders the calendar panel, expands events and handles delete confirmations", async () => {
    const onDeleteEvent = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        errorMessage: "Errore durante l'eliminazione",
      })
      .mockResolvedValueOnce({ success: true });

    render(<CalendarPanel onDeleteEvent={onDeleteEvent} />);

    expect(screen.getByText("Oggi")).toBeInTheDocument();
    expect(screen.getByText("Standup")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Standup"));

    expect(screen.getByText("Allineamento giornaliero")).toBeInTheDocument();
    expect(screen.getByText("Sala riunioni")).toBeInTheDocument();
    expect(screen.getByText("team@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Elimina evento Standup"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Elimina evento" }));
      await Promise.resolve();
    });

    expect(onDeleteEvent).toHaveBeenCalledWith("evt-1");
    expect(screen.getByText("Errore durante l'eliminazione")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Annulla"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    fireEvent.click(screen.getByLabelText("Elimina evento Standup"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Elimina evento" }));
      await Promise.resolve();
    });

    expect(onDeleteEvent).toHaveBeenCalledTimes(2);
  });

  it("renders day groups and the panel as empty when there are no events", () => {
    const { container: emptyGroup } = render(
      <CalendarDayGroup day={{ dateISO: "2026-03-15", events: [] }} />,
    );
    expect(emptyGroup).toBeEmptyDOMElement();

    calendarUiMocks.days = [];
    const { container } = render(<CalendarPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("formats tomorrow and future day labels from the event date", () => {
    const tomorrowDate = "2026-03-16T10:00:00";
    const futureDate = "2026-03-18T10:00:00";
    const future = new Date(futureDate);
    const weekday = future.toLocaleDateString("it-IT", { weekday: "long" });
    const month = future.toLocaleDateString("it-IT", { month: "short" });
    const expectedLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${future.getDate()} ${month}`;

    const { rerender } = render(
      <ProviderWrapper
        days={[
          {
            dateISO: tomorrowDate,
            dayLabel: "ignored",
            events: [{ id: "evt-domani", title: "Demo", time: "10:00" }],
          },
        ]}
      >
        <CalendarDayGroup
          day={{
            dateISO: tomorrowDate,
            events: [{ id: "evt-domani", title: "Demo", time: "10:00" }],
          }}
        />
      </ProviderWrapper>,
    );

    expect(screen.getByText("Domani")).toBeInTheDocument();

    rerender(
      <ProviderWrapper
        days={[
          {
            dateISO: futureDate,
            dayLabel: "ignored",
            events: [{ id: "evt-futuro", title: "Review", time: "12:00" }],
          },
        ]}
      >
        <CalendarDayGroup
          day={{
            dateISO: futureDate,
            events: [{ id: "evt-futuro", title: "Review", time: "12:00" }],
          }}
        />
      </ProviderWrapper>,
    );

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });
});
