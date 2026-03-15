// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

const calendarServiceMocks = vi.hoisted(() => ({
  getCalendarService: vi.fn(),
}));

vi.mock("@/app/_features/calendar/server/calendar.service", () => calendarServiceMocks);

import {
  handleCreateCalendarEvent,
  handleDeleteCalendarEvent,
  handleGetCalendarEvents,
  handleUpdateCalendarEvent,
} from "./calendar-route.handlers";

function createServiceMock() {
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };
}

describe("calendar route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates GET queries and returns a 503 response when the service is not configured", async () => {
    const service = createServiceMock();
    service.isConfigured.mockReturnValue(false);
    calendarServiceMocks.getCalendarService.mockReturnValue(service);

    const invalidResponse = await handleGetCalendarEvents(
      new URLSearchParams("from=2026-01-01T00:00:00.000Z"),
    );
    const notConfiguredResponse = await handleGetCalendarEvents(new URLSearchParams());

    expect(invalidResponse.status).toBe(400);
    expect(notConfiguredResponse.status).toBe(503);
  });

  it("returns mapped calendar events and period metadata", async () => {
    const service = createServiceMock();
    calendarServiceMocks.getCalendarService.mockReturnValue(service);
    service.getEvents.mockResolvedValue({
      events: [
        {
          id: "evt-1",
          title: "Review",
          startTime: new Date("2026-03-15T09:30:00.000Z"),
          endTime: new Date("2026-03-15T10:00:00.000Z"),
          description: "Sprint review",
          location: "Room A",
          attendees: ["a@example.com"],
          color: "#4285f4",
          isAllDay: false,
        },
      ],
    });

    const response = await handleGetCalendarEvents(new URLSearchParams("daysAhead=3"));

    expect(service.getEvents).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      eventCount: 1,
      events: [
        {
          id: "evt-1",
          title: "Review",
          description: "Sprint review",
          location: "Room A",
        },
      ],
    });
  });

  it("validates create payloads and maps create success and token-expired failures", async () => {
    const service = createServiceMock();
    calendarServiceMocks.getCalendarService.mockReturnValue(service);
    service.createEvent
      .mockResolvedValueOnce({
        success: true,
        event: {
          id: "evt-1",
          title: "Review",
          startTime: new Date("2026-03-15T09:30:00.000Z"),
          endTime: new Date("2026-03-15T10:00:00.000Z"),
        },
      })
      .mockResolvedValueOnce({
        success: false,
        error: "REFRESH_TOKEN_EXPIRED",
      });

    const invalidResponse = await handleCreateCalendarEvent({});
    const successResponse = await handleCreateCalendarEvent({
      title: "Review",
      startTime: "2026-03-15T09:30:00.000Z",
      endTime: "2026-03-15T10:00:00.000Z",
    });
    const expiredResponse = await handleCreateCalendarEvent({
      title: "Review",
      startTime: "2026-03-15T09:30:00.000Z",
    });

    expect(invalidResponse.status).toBe(400);
    expect(successResponse.status).toBe(200);
    expect(expiredResponse.status).toBe(401);
  });

  it("validates updates and maps update success and failures", async () => {
    const service = createServiceMock();
    calendarServiceMocks.getCalendarService.mockReturnValue(service);
    service.updateEvent
      .mockResolvedValueOnce({
        success: true,
        event: {
          id: "evt-1",
          title: "Updated",
          startTime: new Date("2026-03-15T09:30:00.000Z"),
        },
      })
      .mockResolvedValueOnce({
        success: false,
        error: "boom",
      });

    const invalidResponse = await handleUpdateCalendarEvent({ eventId: "evt-1" });
    const successResponse = await handleUpdateCalendarEvent({
      eventId: "evt-1",
      title: "Updated",
    });
    const failureResponse = await handleUpdateCalendarEvent({
      eventId: "evt-1",
      title: "Again",
    });

    expect(invalidResponse.status).toBe(400);
    expect(successResponse.status).toBe(200);
    expect(failureResponse.status).toBe(500);
  });

  it("validates delete queries and maps delete responses", async () => {
    const service = createServiceMock();
    calendarServiceMocks.getCalendarService.mockReturnValue(service);
    service.deleteEvent
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "REFRESH_TOKEN_EXPIRED" });

    const invalidResponse = await handleDeleteCalendarEvent(new URLSearchParams());
    const successResponse = await handleDeleteCalendarEvent(new URLSearchParams("eventId=evt-1"));
    const expiredResponse = await handleDeleteCalendarEvent(new URLSearchParams("eventId=evt-2"));

    expect(invalidResponse.status).toBe(400);
    expect(successResponse.status).toBe(200);
    expect(expiredResponse.status).toBe(401);
  });
});
