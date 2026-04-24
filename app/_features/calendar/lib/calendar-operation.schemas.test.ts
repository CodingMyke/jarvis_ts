import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calendarCreateBodySchema,
  calendarGetQuerySchema,
  calendarUpdateBodySchema,
  getCalendarSchemaErrorMessage,
  resolveCalendarRange,
} from "./calendar-operation.schemas";

describe("calendar-operation.schemas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T09:30:00.000Z"));
  });

  it("validates query combinations and date ordering", () => {
    expect(() => calendarGetQuerySchema.parse({ from: "2026-03-15T09:00:00.000Z" })).toThrow(
      "Fornire entrambe le date oppure daysAhead",
    );

    expect(() =>
      calendarCreateBodySchema.parse({
        title: "Standup",
        startTime: "2026-03-15T10:00:00.000Z",
        endTime: "2026-03-15T09:00:00.000Z",
      }),
    ).toThrow("La data di fine deve essere successiva alla data di inizio");

    expect(() =>
      calendarUpdateBodySchema.parse({
        eventId: "evt-1",
      }),
    ).toThrow("Nessun aggiornamento specificato");

    expect(() =>
      calendarUpdateBodySchema.parse({
        eventId: "evt-1",
        startTime: "2026-03-15T11:00:00.000Z",
        endTime: "2026-03-15T10:00:00.000Z",
      }),
    ).toThrow("La data di fine deve essere successiva alla data di inizio");
  });

  it("resolves explicit and default calendar ranges", () => {
    expect(
      resolveCalendarRange({
        from: "2026-03-20T09:00:00.000Z",
        to: "2026-03-21T09:00:00.000Z",
      }),
    ).toEqual({
      from: new Date("2026-03-20T09:00:00.000Z"),
      to: new Date("2026-03-21T09:00:00.000Z"),
    });

    expect(resolveCalendarRange({})).toEqual({
      from: new Date("2026-03-15T09:30:00.000Z"),
      to: new Date("2026-03-22T09:30:00.000Z"),
    });
  });

  it("formats schema errors with or without issue paths", () => {
    const pathError = new ZodError([
      {
        code: "custom",
        message: "Titolo mancante",
        path: ["title"],
      },
    ]);

    expect(getCalendarSchemaErrorMessage(pathError, "fallback")).toBe("title: Titolo mancante");
    expect(getCalendarSchemaErrorMessage(new ZodError([]), "fallback")).toBe("fallback");
  });
});
