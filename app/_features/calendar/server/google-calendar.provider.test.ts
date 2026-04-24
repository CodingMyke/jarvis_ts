// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GoogleCalendarProvider", () => {
  type PrivateGoogleCalendarProvider = {
    getValidAccessToken(forceRefresh?: boolean): Promise<string | null>;
    makeApiRequest(url: string, options?: RequestInit, retryOn401?: boolean): Promise<Response>;
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refreshes and caches OAuth access tokens, including invalid_grant failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const privateProvider = provider as unknown as PrivateGoogleCalendarProvider;

    await expect(privateProvider.getValidAccessToken()).resolves.toBe("token-1");
    await expect(privateProvider.getValidAccessToken()).resolves.toBe("token-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(privateProvider.getValidAccessToken(true)).resolves.toBeNull();
  });

  it("gets events with API key fallback, maps Google payloads and swallows provider failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "event-1",
                summary: "Riunione",
                start: { dateTime: "2026-03-15T09:00:00.000Z" },
                end: { dateTime: "2026-03-15T10:00:00.000Z" },
                description: "Allineamento",
                location: "Sala A",
                attendees: [{ email: "a@test.dev" }, { displayName: "Mario" }],
                colorId: "4",
              },
              {
                id: "event-2",
                start: { date: "2026-03-16" },
                end: { date: "2026-03-17" },
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const configuredProvider = new GoogleCalendarProvider({
      apiKey: "calendar-key",
      calendarId: "primary",
    });
    const unconfiguredProvider = new GoogleCalendarProvider();

    await expect(unconfiguredProvider.getEvents()).resolves.toMatchObject({
      events: [],
      timeRange: {
        from: expect.any(Date),
        to: expect.any(Date),
      },
    });

    await expect(
      configuredProvider.getEvents({
        from: new Date("2026-03-15T00:00:00.000Z"),
        to: new Date("2026-03-20T00:00:00.000Z"),
        maxResults: 5,
      }),
    ).resolves.toEqual({
      events: [
        {
          id: "event-1",
          title: "Riunione",
          startTime: new Date("2026-03-15T09:00:00.000Z"),
          endTime: new Date("2026-03-15T10:00:00.000Z"),
          description: "Allineamento",
          location: "Sala A",
          attendees: ["a@test.dev", "Mario"],
          color: "#e67c73",
          isAllDay: false,
        },
        {
          id: "event-2",
          title: "Evento senza titolo",
          startTime: new Date("2026-03-16"),
          endTime: new Date("2026-03-17"),
          description: undefined,
          location: undefined,
          attendees: undefined,
          color: "#4285f4",
          isAllDay: true,
        },
      ],
      timeRange: {
        from: new Date("2026-03-15T00:00:00.000Z"),
        to: new Date("2026-03-20T00:00:00.000Z"),
      },
    });

    await expect(configuredProvider.getEvents()).resolves.toMatchObject({
      events: [],
      timeRange: {
        from: expect.any(Date),
        to: expect.any(Date),
      },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("key=calendar-key");
  });

  it("validates create requests, handles auth errors and maps successful Google events", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const startTime = new Date("2026-03-15T09:00:00.000Z");

    await expect(new GoogleCalendarProvider().createEvent({ title: " ", startTime })).resolves
      .toEqual({
        success: false,
        error: "Il titolo dell'evento è obbligatorio",
        event: {
          id: "",
          title: "",
          startTime,
        },
      });

    await expect(
      new GoogleCalendarProvider({ apiKey: "calendar-key" }).createEvent({
        title: "Riunione",
        startTime,
      }),
    ).resolves.toEqual({
      success: false,
      error:
        "Autenticazione OAuth richiesta per creare eventi. Configura GOOGLE_CALENDAR_REFRESH_TOKEN.",
      event: {
        id: "",
        title: "Riunione",
        startTime,
      },
    });

    const expiredFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );
    vi.stubGlobal("fetch", expiredFetch);

    await expect(
      new GoogleCalendarProvider({
        refreshToken: "refresh-token",
        clientId: "client-id",
        clientSecret: "client-secret",
      }).createEvent({
        title: "Riunione",
        startTime,
      }),
    ).resolves.toMatchObject({
      success: false,
      error:
        "Autenticazione OAuth richiesta per creare eventi. Configura GOOGLE_CALENDAR_REFRESH_TOKEN.",
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const successFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-1",
            summary: "Evento creato",
            start: { date: "2026-03-15" },
            end: { date: "2026-03-16" },
            colorId: "10",
            attendees: [{ email: "a@test.dev" }, { displayName: "Mario" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "payload invalid" } }), { status: 400 }),
      );
    vi.stubGlobal("fetch", successFetch);

    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });
    await expect(
      provider.createEvent({
        title: "Evento creato",
        startTime,
        description: "Dettagli",
        location: "Sala A",
        attendees: ["a@test.dev", "Mario"],
        color: "#0b8043",
        isAllDay: true,
      }),
    ).resolves.toEqual({
      success: true,
      event: {
        id: "event-1",
        title: "Evento creato",
        startTime: new Date("2026-03-15"),
        endTime: new Date("2026-03-16"),
        description: undefined,
        location: undefined,
        attendees: ["a@test.dev", "Mario"],
        color: "#0b8043",
        isAllDay: true,
      },
    });

    const createRequest = successFetch.mock.calls[0];
    expect(createRequest?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
    expect(JSON.parse(String(createRequest?.[1]?.body))).toEqual({
      summary: "Evento creato",
      start: { date: "2026-03-15" },
      end: { date: "2026-03-16" },
      description: "Dettagli",
      location: "Sala A",
      attendees: [{ email: "a@test.dev" }, { displayName: "Mario" }],
      colorId: "10",
    });

    await expect(
      provider.createEvent({
        title: "Evento creato",
        startTime,
        endTime: new Date("2026-03-15T11:00:00.000Z"),
      }),
    ).resolves.toEqual({
      success: false,
      error: "payload invalid",
      event: {
        id: "",
        title: "Evento creato",
        startTime,
      },
    });

    expect(timezone).toBeTypeOf("string");
  });

  it("validates and updates events by merging the existing Google payload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");

    await expect(new GoogleCalendarProvider().updateEvent({ eventId: "" })).resolves.toEqual({
      success: false,
      error: "L'ID dell'evento è obbligatorio",
      event: {
        id: "",
        title: "",
        startTime: expect.any(Date),
      },
    });
    await expect(
      new GoogleCalendarProvider({ accessToken: "token" }).updateEvent({
        eventId: "event-1",
        title: " ",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Il titolo dell'evento non può essere vuoto",
      event: {
        id: "event-1",
        title: "",
        startTime: expect.any(Date),
      },
    });
    await expect(
      new GoogleCalendarProvider({ accessToken: "token" }).updateEvent({
        eventId: "event-1",
        title: "x".repeat(501),
      }),
    ).resolves.toEqual({
      success: false,
      error: "Il titolo dell'evento non può superare i 500 caratteri",
      event: {
        id: "event-1",
        title: "x".repeat(501),
        startTime: expect.any(Date),
      },
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-1",
            summary: "Vecchio titolo",
            start: { dateTime: "2026-03-15T09:00:00.000Z" },
            end: { dateTime: "2026-03-15T10:00:00.000Z", timeZone: "UTC" },
            description: "old",
            location: "old room",
            colorId: "4",
            attendees: [{ email: "old@test.dev" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-1",
            summary: "Nuovo titolo",
            start: { dateTime: "2026-03-15T11:00:00.000Z" },
            end: { dateTime: "2026-03-15T12:30:00.000Z" },
            description: "nuovo",
            location: "Sala A",
            attendees: [{ email: "a@test.dev" }],
            colorId: "3",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-2",
            summary: "Da validare",
            start: { dateTime: "2026-03-15T09:00:00.000Z" },
            end: { dateTime: "2026-03-15T10:00:00.000Z" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });
    await expect(
      provider.updateEvent({
        eventId: "event-1",
        title: " Nuovo titolo ",
        startTime: new Date("2026-03-15T11:00:00.000Z"),
        endTime: new Date("2026-03-15T12:30:00.000Z"),
        description: "nuovo",
        location: "Sala A",
        attendees: ["a@test.dev"],
        color: "#8e24aa",
      }),
    ).resolves.toEqual({
      success: true,
      event: {
        id: "event-1",
        title: "Nuovo titolo",
        startTime: new Date("2026-03-15T11:00:00.000Z"),
        endTime: new Date("2026-03-15T12:30:00.000Z"),
        description: "nuovo",
        location: "Sala A",
        attendees: ["a@test.dev"],
        color: "#8e24aa",
        isAllDay: false,
      },
    });

    const updateRequest = fetchMock.mock.calls[1];
    expect(updateRequest?.[1]).toMatchObject({
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
    expect(JSON.parse(String(updateRequest?.[1]?.body))).toMatchObject({
      summary: "Nuovo titolo",
      description: "nuovo",
      location: "Sala A",
      attendees: [{ email: "a@test.dev" }],
      colorId: "3",
    });

    await expect(
      provider.updateEvent({
        eventId: "event-2",
        endTime: new Date("2026-03-15T08:00:00.000Z"),
      }),
    ).resolves.toEqual({
      success: false,
      error: "La data di fine deve essere successiva alla data di inizio",
      event: {
        id: "event-2",
        title: "Da validare",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
      },
    });
  });

  it("validates delete requests and maps deletion success or HTTP failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");

    await expect(new GoogleCalendarProvider().deleteEvent("")).resolves.toEqual({
      success: false,
      error: "L'ID dell'evento è obbligatorio",
    });
    await expect(
      new GoogleCalendarProvider({ apiKey: "calendar-key" }).deleteEvent("event-1"),
    ).resolves.toEqual({
      success: false,
      error:
        "Autenticazione OAuth richiesta per eliminare eventi. Configura GOOGLE_CALENDAR_REFRESH_TOKEN.",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "bad delete" } }), { status: 500 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });
    await expect(provider.deleteEvent("event-1")).resolves.toEqual({ success: true });
    await expect(provider.deleteEvent("event-2")).resolves.toEqual({
      success: false,
      error: "Evento non trovato",
    });
    await expect(provider.deleteEvent("event-3")).resolves.toEqual({
      success: false,
      error: "bad delete",
    });
  });

  it("retries API requests after a 401 by invalidating the cached token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("expired", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-2", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    const privateProvider = provider as unknown as PrivateGoogleCalendarProvider;
    const response = await privateProvider.makeApiRequest("https://example.com/calendar");

    await expect(response.text()).resolves.toBe("ok");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token-2" },
    });
  });

  it("maps timed create payloads with default end times, mixed attendees and case-insensitive colors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "event-timed",
          summary: "Call cliente",
          start: { dateTime: "2026-03-15T09:00:00.000Z" },
          end: { dateTime: "2026-03-15T10:00:00.000Z" },
          description: "Follow-up",
          location: "Online",
          attendees: [{ displayName: "Mario" }, { email: "client@example.com" }],
          colorId: "1",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });

    await expect(
      provider.createEvent({
        title: "Call cliente",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
        description: "Follow-up",
        location: "Online",
        attendees: ["Mario", "client@example.com"],
        color: "#4285F4",
      }),
    ).resolves.toEqual({
      success: true,
      event: {
        id: "event-timed",
        title: "Call cliente",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
        endTime: new Date("2026-03-15T10:00:00.000Z"),
        description: "Follow-up",
        location: "Online",
        attendees: ["Mario", "client@example.com"],
        color: "#4285f4",
        isAllDay: false,
      },
    });

    const request = fetchMock.mock.calls[0];
    expect(request?.[1]).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token",
      },
    });
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      summary: "Call cliente",
      description: "Follow-up",
      location: "Online",
      attendees: [{ displayName: "Mario" }, { email: "client@example.com" }],
      colorId: "1",
      start: {
        dateTime: "2026-03-15T09:00:00.000Z",
      },
      end: {
        dateTime: "2026-03-15T10:00:00.000Z",
      },
    });
  });

  it("updates all-day events by clearing optional fields, attendees and custom colors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-all-day",
            summary: "Evento originale",
            start: { date: "2026-03-20" },
            end: { date: "2026-03-23" },
            description: "Vecchia descrizione",
            location: "Ufficio",
            attendees: [{ email: "a@test.dev" }],
            colorId: "4",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-all-day",
            summary: "Evento originale",
            start: { date: "2026-03-22" },
            end: { date: "2026-03-23" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });

    await expect(
      provider.updateEvent({
        eventId: "event-all-day",
        startTime: new Date("2026-03-22T00:00:00.000Z"),
        isAllDay: true,
        description: " ",
        location: " ",
        attendees: [],
        color: null as unknown as string,
      }),
    ).resolves.toEqual({
      success: true,
      event: {
        id: "event-all-day",
        title: "Evento originale",
        startTime: new Date("2026-03-22"),
        endTime: new Date("2026-03-23"),
        description: undefined,
        location: undefined,
        attendees: undefined,
        color: "#4285f4",
        isAllDay: true,
      },
    });

    const updateRequest = fetchMock.mock.calls[1];
    expect(JSON.parse(String(updateRequest?.[1]?.body))).toEqual({
      id: "event-all-day",
      summary: "Evento originale",
      start: { date: "2026-03-22" },
      end: { date: "2026-03-23" },
      description: null,
      location: null,
      attendees: [],
    });
  });

  it("returns refresh-token errors on create when a retried 401 cannot obtain a new token", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("oauth unavailable", { status: 500 }))
      .mockResolvedValueOnce(new Response("oauth unavailable", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    await expect(
      provider.createEvent({
        title: "Evento protetto",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
      }),
    ).resolves.toEqual({
      success: false,
      error:
        "REFRESH_TOKEN_EXPIRED: Il refresh token è scaduto o revocato. È necessario riautorizzare l'applicazione. Vai su /setup/calendar per riautorizzare.",
      event: {
        id: "",
        title: "Evento protetto",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
      },
    });
  });

  it("maps update lookup failures, API errors and delete network failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "event-2",
            summary: "Evento esistente",
            start: { dateTime: "2026-03-15T09:00:00.000Z" },
            end: { dateTime: "2026-03-15T10:00:00.000Z", timeZone: "UTC" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "bad put" } }), { status: 500 }),
      )
      .mockRejectedValueOnce(new Error("delete offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { GoogleCalendarProvider } = await import("./google-calendar.provider");
    const provider = new GoogleCalendarProvider({ accessToken: "access-token" });

    await expect(
      provider.updateEvent({
        eventId: "missing-event",
        title: "Nuovo titolo",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Evento non trovato",
      event: {
        id: "missing-event",
        title: "",
        startTime: expect.any(Date),
      },
    });

    await expect(
      provider.updateEvent({
        eventId: "event-2",
        title: "Nuovo titolo",
      }),
    ).resolves.toEqual({
      success: false,
      error: "bad put",
      event: {
        id: "event-2",
        title: "Nuovo titolo",
        startTime: new Date("2026-03-15T09:00:00.000Z"),
      },
    });

    await expect(provider.deleteEvent("event-2")).resolves.toEqual({
      success: false,
      error: "delete offline",
    });
  });
});
