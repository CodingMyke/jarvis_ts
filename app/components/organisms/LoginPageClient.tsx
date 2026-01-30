"use client";

import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/app/components/molecules";

/**
 * Client della pagina di login: pulsante Google e messaggio errore da query.
 */
export function LoginPageClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex flex-col items-center gap-4">
      <AuthButton redirectToAfterLogin="/assistant" />
      {error && (
        <p className="max-w-sm text-center text-sm text-red-400" role="alert">
          {decodeURIComponent(error)}
        </p>
      )}
    </div>
  );
}
