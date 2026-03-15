import { AuthButton } from "@/app/design/molecules/auth/AuthButton";

interface LoginCardProps {
  error?: string | null;
}

export function LoginCard({ error }: LoginCardProps) {
  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent/80">Voice Workspace</p>
        <p className="text-sm text-muted">
          Accedi con Google per usare chat, calendario, task e timer nello stesso flusso.
        </p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <AuthButton redirectToAfterLogin="/assistant" />
        {error ? (
          <p className="max-w-sm text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
