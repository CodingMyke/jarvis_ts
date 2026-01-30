"use client";

import { Button } from "@/app/components/atoms";
import { useAuth } from "@/app/hooks/useAuth";

export interface AuthButtonProps {
  /** Path dove reindirizzare dopo il login (es. "/assistant"). Usare sulla pagina di login. */
  redirectToAfterLogin?: string;
}

/**
 * Pulsante auth: "Accedi con Google" se non autenticato, email + "Esci" se autenticato.
 */
export function AuthButton({ redirectToAfterLogin }: AuthButtonProps = {}) {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();

  if (isLoading) {
    return (
      <span className="text-muted text-sm" aria-hidden>
        ...
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[140px] truncate text-sm text-muted" title={user.email ?? undefined}>
          {user.email}
        </span>
        <Button variant="secondary" onClick={() => signOut()} type="button">
          Esci
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      onClick={() => signInWithGoogle(redirectToAfterLogin)}
      type="button"
    >
      Accedi con Google
    </Button>
  );
}
