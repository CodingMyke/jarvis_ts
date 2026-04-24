// @vitest-environment jsdom
// used the fkg testing skill zioo

import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

const authMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  authListener: null as ((event: string, session: { user: User | null } | null) => void) | null,
}));

vi.mock("@/app/_server/supabase/client", () => ({
  createClient: authMocks.createClient,
}));

vi.mock("@/app/_features/auth/lib", () => ({
  signInWithGoogle: authMocks.signInWithGoogle,
  signOut: authMocks.signOut,
}));

describe("useAuth", () => {
  beforeEach(() => {
    authMocks.authListener = null;
    authMocks.createClient.mockReset();
    authMocks.getUser.mockReset();
    authMocks.onAuthStateChange.mockReset();
    authMocks.unsubscribe.mockReset();
    authMocks.signInWithGoogle.mockReset();
    authMocks.signOut.mockReset();

    authMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "myke@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-03-15T09:30:00.000Z",
        } satisfies User,
      },
    });

    authMocks.onAuthStateChange.mockImplementation((listener) => {
      authMocks.authListener = listener;

      return {
        data: {
          subscription: {
            unsubscribe: authMocks.unsubscribe,
          },
        },
      };
    });

    authMocks.createClient.mockReturnValue({
      auth: {
        getUser: authMocks.getUser,
        onAuthStateChange: authMocks.onAuthStateChange,
      },
    });
  });

  it("loads the initial user, reacts to auth changes and unsubscribes on unmount", async () => {
    const { result, unmount } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.email).toBe("myke@example.com");
    expect(authMocks.getUser).toHaveBeenCalledOnce();
    expect(authMocks.onAuthStateChange).toHaveBeenCalledOnce();

    act(() => {
      authMocks.authListener?.("SIGNED_OUT", null);
    });

    expect(result.current.user).toBeNull();

    act(() => {
      authMocks.authListener?.("SIGNED_IN", {
        user: {
          id: "user-2",
          email: "jarvis@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-03-15T10:00:00.000Z",
        } satisfies User,
      });
    });

    expect(result.current.user?.email).toBe("jarvis@example.com");

    unmount();

    expect(authMocks.unsubscribe).toHaveBeenCalledOnce();
  });

  it("exposes the auth actions from the shared auth service", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.signInWithGoogle("/assistant");
      await result.current.signOut();
    });

    expect(authMocks.signInWithGoogle).toHaveBeenCalledWith("/assistant");
    expect(authMocks.signOut).toHaveBeenCalledOnce();
  });
});
