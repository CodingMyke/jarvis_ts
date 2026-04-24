// used the fkg testing skill zioo
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("calendar.service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  it("creates mock events with predictable seeds", async () => {
    const service = await import("./calendar.service");
    const events = service.createMockEvents();

    expect(events).toHaveLength(6);
    expect(events[0]).toMatchObject({
      id: "mock-1",
      title: "Daily standup",
    });
  });

  it("supports the mock provider lifecycle through CalendarService", async () => {
    const serviceModule = await import("./calendar.service");
    const service = new serviceModule.CalendarService("mock");

    const initialEventsPromise = service.getEvents();
    await vi.advanceTimersByTimeAsync(100);
    const initialEvents = await initialEventsPromise;

    const createPromise = service.createEvent({
      title: "Nuovo evento",
      startTime: new Date("2026-03-15T10:00:00.000Z"),
      endTime: new Date("2026-03-15T11:00:00.000Z"),
    });
    await vi.advanceTimersByTimeAsync(100);
    const created = await createPromise;

    const updatePromise = service.updateEvent({
      eventId: created.event.id,
      title: "Evento aggiornato",
    });
    await vi.advanceTimersByTimeAsync(100);
    const updated = await updatePromise;

    const groupedPromise = service.getEventsGroupedByDay({
      from: new Date("2026-03-15T00:00:00.000Z"),
      to: new Date("2026-03-20T00:00:00.000Z"),
    });
    await vi.advanceTimersByTimeAsync(100);
    const grouped = await groupedPromise;

    const deletePromise = service.deleteEvent(created.event.id);
    await vi.advanceTimersByTimeAsync(100);
    const deleted = await deletePromise;

    expect(initialEvents.events.length).toBeGreaterThan(0);
    expect(created).toMatchObject({
      success: true,
      event: { title: "Nuovo evento" },
    });
    expect(updated).toMatchObject({
      success: true,
      event: { title: "Evento aggiornato" },
    });
    expect(grouped.size).toBeGreaterThan(0);
    expect(deleted).toEqual({ success: true });
  });

  it("returns validation errors from the mock provider", async () => {
    const serviceModule = await import("./calendar.service");
    const service = new serviceModule.CalendarService("mock");

    const createFailurePromise = service.createEvent({
      title: "",
      startTime: new Date("2026-03-15T10:00:00.000Z"),
    });
    await vi.advanceTimersByTimeAsync(100);
    const createFailure = await createFailurePromise;

    const updateFailurePromise = service.updateEvent({
      eventId: "",
      title: "Broken",
    });
    await vi.advanceTimersByTimeAsync(100);
    const updateFailure = await updateFailurePromise;

    const deleteFailurePromise = service.deleteEvent("missing-id");
    await vi.advanceTimersByTimeAsync(100);
    const deleteFailure = await deleteFailurePromise;

    expect(createFailure).toMatchObject({
      success: false,
      error: "Il titolo dell'evento è obbligatorio",
    });
    expect(updateFailure).toMatchObject({
      success: false,
      error: "L'ID dell'evento è obbligatorio",
    });
    expect(deleteFailure).toMatchObject({
      success: false,
      error: "Evento non trovato",
    });
  });

  it("caches providers and falls back to the mock singleton when Google is not configured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const serviceModule = await import("./calendar.service");

    const providerA = serviceModule.getCalendarProvider("mock");
    const providerB = serviceModule.getCalendarProvider("mock");
    const singleton = serviceModule.getCalendarService();

    expect(providerA).toBe(providerB);
    expect(singleton.providerName).toBe("Mock Calendar");
    expect(infoSpy).toHaveBeenCalled();
    expect(() => serviceModule.getCalendarProvider("unknown" as never)).toThrow(
      "Provider sconosciuto: unknown",
    );
  });
});
