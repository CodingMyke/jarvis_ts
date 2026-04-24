// used the fkg testing skill zioo
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonError, jsonOk } from "./responses";
import { getZodErrorMessage } from "./zod";

describe("responses", () => {
  it("returns jsonOk responses with the provided status", async () => {
    const response = jsonOk({ success: true, count: 2 }, 201);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ success: true, count: 2 });
  });

  it("returns jsonError responses with success=false", async () => {
    const response = jsonError(400, {
      error: "INVALID_PAYLOAD",
      message: "Payload non valido",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "INVALID_PAYLOAD",
      message: "Payload non valido",
    });
  });
});

describe("getZodErrorMessage", () => {
  it("returns the first zod issue including the field path", () => {
    const result = z
      .object({
        user: z.object({
          name: z.string().min(2, "Nome troppo corto"),
        }),
      })
      .safeParse({
        user: {
          name: "",
        },
      });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected schema parsing to fail");
    }

    expect(getZodErrorMessage(result.error)).toBe("user.name: Nome troppo corto");
  });

  it("returns a generic message when zod exposes no issues", () => {
    expect(getZodErrorMessage({ issues: [] } as never)).toBe("Payload non valido");
  });
});

describe("getAuthContext", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the authenticated user context", async () => {
    const cookieStore = { getAll: vi.fn(() => []) };
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const createClient = vi.fn(() => ({
      auth: {
        getUser,
      },
    }));

    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue(cookieStore),
    }));
    vi.doMock("@/app/_server/supabase/server", () => ({
      createClient,
    }));

    const { getAuthContext } = await import("./auth");
    const auth = await getAuthContext();

    expect(createClient).toHaveBeenCalledWith(cookieStore);
    expect(getUser).toHaveBeenCalledOnce();
    expect(auth).toMatchObject({
      userId: "user-123",
    });
  });

  it("returns null when supabase does not provide a user", async () => {
    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue({ getAll: vi.fn(() => []) }),
    }));
    vi.doMock("@/app/_server/supabase/server", () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error("missing session"),
          }),
        },
      })),
    }));

    const { getAuthContext } = await import("./auth");

    await expect(getAuthContext()).resolves.toBeNull();
  });
});
