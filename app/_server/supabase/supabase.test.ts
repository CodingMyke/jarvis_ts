// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockServerClientOptions {
  cookies: {
    getAll: () => unknown[];
    setAll: (cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void;
  };
}

describe("supabase.client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("reads the Supabase config from env", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "anon-key");

    const { getSupabaseConfig } = await import("./supabase.client");

    expect(getSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("returns null when the env is incomplete", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "");

    const { createSupabaseClient, getSupabaseConfig } = await import("./supabase.client");

    expect(getSupabaseConfig()).toBeNull();
    expect(createSupabaseClient()).toBeNull();
  });

  it("creates and caches the singleton Supabase JS client", async () => {
    const createClient = vi.fn(() => ({ kind: "supabase-js-client" }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient,
    }));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "anon-key");

    const { createSupabaseClient, getSupabaseClient } = await import("./supabase.client");

    expect(createSupabaseClient()).toEqual({ kind: "supabase-js-client" });
    expect(getSupabaseClient()).toEqual({ kind: "supabase-js-client" });
    expect(getSupabaseClient()).toBe(getSupabaseClient());
    expect(createClient).toHaveBeenCalledTimes(2);
  });
});

describe("browser and server clients", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("throws from the browser client when env is missing", async () => {
    const { createClient } = await import("./client");

    expect(() => createClient()).toThrow(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local",
    );
  });

  it("creates the browser client with the configured env", async () => {
    const createBrowserClient = vi.fn(() => ({ kind: "browser-client" }));
    vi.doMock("@supabase/ssr", () => ({
      createBrowserClient,
    }));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "anon-key");

    const { createClient } = await import("./client");

    expect(createClient()).toEqual({ kind: "browser-client" });
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key",
    );
  });

  it("wraps cookie access when creating the server client", async () => {
    const createServerClient = vi.fn((...args: [string, string, unknown]) => {
      void args;
      return { kind: "server-client" };
    });
    vi.doMock("@supabase/ssr", () => ({
      createServerClient,
    }));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "anon-key");

    const cookieStore = {
      getAll: vi.fn(() => [{ name: "sb", value: "1" }]),
      set: vi.fn(),
    };

    const { createClient } = await import("./server");
    const client = createClient(cookieStore as never);

    expect(client).toEqual({ kind: "server-client" });
    expect(createServerClient).toHaveBeenCalledOnce();

    const options = createServerClient.mock.calls[0]?.[2] as MockServerClientOptions | undefined;
    if (!options) {
      throw new Error("Expected createServerClient options");
    }
    expect(options.cookies.getAll()).toEqual([{ name: "sb", value: "1" }]);

    options.cookies.setAll([
      { name: "a", value: "1", options: { path: "/" } },
      { name: "b", value: "2", options: { httpOnly: true } },
    ]);
    expect(cookieStore.set).toHaveBeenNthCalledWith(1, "a", "1", { path: "/" });
    expect(cookieStore.set).toHaveBeenNthCalledWith(2, "b", "2", { httpOnly: true });
  });

  it("swallows cookie set errors in the server client wrapper", async () => {
    const createServerClient = vi.fn((...args: [string, string, unknown]) => {
      void args;
      return { kind: "server-client" };
    });
    vi.doMock("@supabase/ssr", () => ({
      createServerClient,
    }));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "anon-key");

    const cookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error("read-only cookies");
      }),
    };

    const { createClient } = await import("./server");
    createClient(cookieStore as never);

    const options = createServerClient.mock.calls[0]?.[2] as MockServerClientOptions | undefined;
    if (!options) {
      throw new Error("Expected createServerClient options");
    }
    expect(() =>
      options.cookies.setAll([{ name: "sb", value: "1", options: { path: "/" } }]),
    ).not.toThrow();
  });
});

describe("providers and database service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the Supabase provider contract", async () => {
    const getSupabaseClient = vi.fn(() => ({ kind: "client" }));
    vi.doMock("./supabase.client", () => ({
      getSupabaseClient,
    }));

    const { SupabaseProvider } = await import("./supabase.provider");
    const provider = new SupabaseProvider();

    expect(provider.name).toBe("Supabase");
    expect(provider.isConfigured()).toBe(true);
    expect(provider.getClient()).toEqual({ kind: "client" });
    expect(getSupabaseClient).toHaveBeenCalledTimes(2);
  });

  it("delegates DatabaseService to the configured provider and caches the singleton", async () => {
    class MockSupabaseProvider {
      readonly name = "Mock Supabase";

      isConfigured(): boolean {
        return true;
      }

      getClient() {
        return { kind: "mock-client" };
      }
    }

    vi.doMock("./supabase.provider", () => ({
      SupabaseProvider: MockSupabaseProvider,
    }));

    const { DatabaseService, getDatabaseService } = await import("./database.service");
    const service = new DatabaseService();

    expect(service.providerName).toBe("Mock Supabase");
    expect(service.isConfigured()).toBe(true);
    expect(getDatabaseService()).toBe(getDatabaseService());
  });

  it("throws for unknown provider types", async () => {
    const { DatabaseService } = await import("./database.service");

    expect(() => new DatabaseService("unknown" as never)).toThrow(
      "Provider database sconosciuto: unknown",
    );
  });
});
