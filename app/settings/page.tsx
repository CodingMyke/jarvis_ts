import { AuthButton, SettingsPageClient } from "@/app/_features/auth";
import { Header } from "@/app/_shared";

/**
 * Pagina impostazioni (protetta). Mostra info account e logout.
 */
export default function SettingsPage() {
  return (
    <>
      <Header title="Impostazioni">
        <AuthButton />
      </Header>
      <SettingsPageClient />
    </>
  );
}
