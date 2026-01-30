"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";
import { signInWithGoogle, signOut } from "@/app/lib/supabase/auth";

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Hook per stato auth Supabase (user, loading) e azioni login/logout.
 * Usa onAuthStateChange per tenere user in sync senza polling.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = createClient();

    const init = async () => {
      const {
        data: { user: initialUser },
      } = await client.auth.getUser();
      setUser(initialUser ?? null);
      setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    signInWithGoogle,
    signOut,
  };
}
