import { Header } from "@/app/components/organisms";
import { AuthButton } from "@/app/components/molecules";
import { SettingsPageClient } from "@/app/components/organisms/SettingsPageClient";

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
