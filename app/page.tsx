import { Suspense } from "react";
import { LoginTemplate } from "@/app/design";

/**
 * Pagina di login (prima schermata). Se l'utente è già loggato il proxy lo reindirizza a /dashboard.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginTemplate />
    </Suspense>
  );
}
