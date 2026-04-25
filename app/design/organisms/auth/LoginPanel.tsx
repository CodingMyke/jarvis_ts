import { LoginCard } from "@/app/design/molecules/auth/LoginCard";

interface LoginPanelProps {
  error?: string | null;
  redirectToAfterLogin?: string;
}

export function LoginPanel({
  error,
  redirectToAfterLogin,
}: LoginPanelProps) {
  return <LoginCard error={error} redirectToAfterLogin={redirectToAfterLogin} />;
}
