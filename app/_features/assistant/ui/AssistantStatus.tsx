import type { AssistantSessionState } from "@/app/_features/assistant/lib";

interface AssistantStatusProps {
  listeningMode: AssistantSessionState;
  assistantName: string;
}

export function AssistantStatus({ listeningMode, assistantName }: AssistantStatusProps) {
  const status =
    listeningMode === "wake_word"
      ? {
          label: `In attesa... Dì "${assistantName}"`,
          color: "text-yellow-400",
          dotColor: "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]",
        }
      : listeningMode === "connected"
        ? {
            label: `${assistantName} è in ascolto`,
            color: "text-accent",
            dotColor: "bg-accent shadow-[0_0_10px_var(--accent-glow)]",
          }
        : {
            label: "Tocca l'orb per iniziare",
            color: "text-muted",
            dotColor: "bg-muted",
          };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${status.dotColor} ${
            listeningMode !== "idle" ? "animate-pulse" : ""
          }`}
        />
        <span className={`text-sm ${status.color}`}>{status.label}</span>
      </div>
    </div>
  );
}
