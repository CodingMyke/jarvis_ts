import { LoginCard } from "@/app/design/molecules/auth/LoginCard";

interface LoginPanelProps {
  error?: string | null;
}

export function LoginPanel({ error }: LoginPanelProps) {
  return <LoginCard error={error} />;
}
