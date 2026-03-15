// used the fkg testing skill zioo
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("auth.service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts the Google OAuth flow and redirects to Supabase callback", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.test/oauth" },
      error: null,
    });
    const createClient = vi.fn(() => ({
      auth: {
        signInWithOAuth,
        signOut: vi.fn(),
      },
    }));

    vi.doMock("@/app/_server/supabase/client", () => ({ createClient }));
    vi.stubGlobal("window", {
      location: {
        origin: "https://jarvis.test",
        href: "",
        reload: vi.fn(),
      },
    });

    const { signInWithGoogle } = await import("./auth.service");

    await signInWithGoogle("/assistant?tab=chat");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://jarvis.test/auth/callback?next=%2Fassistant%3Ftab%3Dchat",
      },
    });
    expect((window as Window).location.href).toBe("https://accounts.google.test/oauth");
  });

  it("throws Supabase auth errors and signs out through the browser client", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("oauth failed"),
    });
    const signOut = vi.fn().mockResolvedValue(undefined);
    const createClient = vi.fn(() => ({
      auth: {
        signInWithOAuth,
        signOut,
      },
    }));

    vi.doMock("@/app/_server/supabase/client", () => ({ createClient }));
    vi.stubGlobal("window", {
      location: {
        origin: "https://jarvis.test",
        href: "",
        reload: vi.fn(),
      },
    });

    const { signInWithGoogle, signOut: logout } = await import("./auth.service");

    await expect(signInWithGoogle()).rejects.toThrow("oauth failed");
    await logout();

    expect(signOut).toHaveBeenCalledOnce();
    expect(window.location.reload).toHaveBeenCalledOnce();
  });
});
