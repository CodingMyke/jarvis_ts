import { AuthButton } from "@/app/design/molecules/auth/AuthButton";
import { AppPanel, Text } from "@/app/_shared/ui";

interface LoginCardProps {
  error?: string | null;
  redirectToAfterLogin?: string;
}

export function LoginCard({
  error,
  redirectToAfterLogin = "/dashboard",
}: LoginCardProps) {
  return (
    <AppPanel className="w-full max-w-md" variant="overlay">
      <div className="space-y-3 text-center">
        <p className="ui-section-label">Voice Workspace</p>
        <Text className="text-sm" tone="muted">
          Accedi con Google per usare chat, calendario, task e timer nello stesso flusso.
        </Text>
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <AuthButton redirectToAfterLogin={redirectToAfterLogin} />
        {error ? <Text className="max-w-sm text-center text-sm" role="alert" tone="danger">{error}</Text> : null}
      </div>
    </AppPanel>
  );
}
