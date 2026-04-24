import { z } from "zod";

const ISO_DATE_TIME_ERROR = "Usa una data ISO valida";
const EVENT_ID_ERROR = "L'ID dell'evento è obbligatorio";

const optionalTrimmedString = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .optional();

export const calendarEventIdSchema = z.string().trim().min(1, EVENT_ID_ERROR);

export const calendarGetQuerySchema = z
  .object({
    from: z.string().datetime({ offset: true, message: ISO_DATE_TIME_ERROR }).optional(),
    to: z.string().datetime({ offset: true, message: ISO_DATE_TIME_ERROR }).optional(),
    daysAhead: z.coerce.number().int().min(1).max(365).optional(),
  })
  .refine(
    ({ from, to, daysAhead }) => {
      if (daysAhead !== undefined) {
        return true;
      }

      return (from === undefined && to === undefined) || (from !== undefined && to !== undefined);
    },
    {
      message: "Fornire entrambe le date oppure daysAhead",
    },
  );

export const calendarCreateBodySchema = z
  .object({
    title: z.string().trim().min(1, "Il titolo dell'evento è obbligatorio").max(500),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    description: optionalTrimmedString,
    location: optionalTrimmedString,
    attendees: z.array(z.string().trim().min(1).max(320)).max(100).optional(),
    color: z.string().trim().min(1).max(50).optional(),
    isAllDay: z.boolean().optional(),
  })
  .superRefine(({ startTime, endTime }, ctx) => {
    if (startTime && endTime && endTime < startTime) {
      ctx.addIssue({
        code: "custom",
        message: "La data di fine deve essere successiva alla data di inizio",
        path: ["endTime"],
      });
    }
  });

export const calendarUpdateBodySchema = z
  .object({
    eventId: calendarEventIdSchema,
    title: optionalTrimmedString,
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    description: optionalTrimmedString.nullable().optional(),
    location: optionalTrimmedString.nullable().optional(),
    attendees: z.array(z.string().trim().min(1).max(320)).max(100).optional(),
    color: z.string().trim().min(1).max(50).nullable().optional(),
    isAllDay: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasUpdates = [
      value.title,
      value.startTime,
      value.endTime,
      value.description,
      value.location,
      value.attendees,
      value.color,
      value.isAllDay,
    ].some((entry) => entry !== undefined);

    if (!hasUpdates) {
      ctx.addIssue({
        code: "custom",
        message: "Nessun aggiornamento specificato",
      });
    }

    if (value.startTime && value.endTime && value.endTime < value.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "La data di fine deve essere successiva alla data di inizio",
        path: ["endTime"],
      });
    }
  });

export const calendarDeleteBodySchema = z.object({
  eventId: calendarEventIdSchema,
});

export type CalendarGetQuery = z.infer<typeof calendarGetQuerySchema>;

export function resolveCalendarRange(input: CalendarGetQuery): { from: Date; to: Date } {
  if (input.daysAhead !== undefined) {
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + input.daysAhead);
    return { from, to };
  }

  if (input.from && input.to) {
    return {
      from: new Date(input.from),
      to: new Date(input.to),
    };
  }

  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export function getCalendarSchemaErrorMessage(error: z.ZodError, fallback: string): string {
  const [issue] = error.issues;

  if (!issue) {
    return fallback;
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
