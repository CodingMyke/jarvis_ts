import { AssistantStatusBlock } from "@/app/design/molecules/assistant/AssistantStatusBlock";
import type { AssistantSessionState } from "@/app/_features/assistant/lib";

interface AssistantStatusPanelProps {
  assistantName: string;
  listeningMode: AssistantSessionState;
}

export function AssistantStatusPanel({
  assistantName,
  listeningMode,
}: AssistantStatusPanelProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      <AssistantStatusBlock
        assistantName={assistantName}
        listeningMode={listeningMode}
      />
    </div>
  );
}
