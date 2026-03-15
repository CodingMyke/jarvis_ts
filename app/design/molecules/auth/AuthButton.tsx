"use client";

import { Button } from "@/app/design/atoms/shared";
import { useAuth } from "@/app/_features/auth/hooks/useAuth";

export interface AuthButtonProps {
  redirectToAfterLogin?: string;
}

export function AuthButton({
  redirectToAfterLogin,
}: AuthButtonProps = {}) {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();

  if (isLoading) {
    return (
      <span className="text-sm text-muted" aria-hidden>
        ...
      </span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="max-w-[140px] truncate text-sm text-muted"
          title={user.email ?? undefined}
        >
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
