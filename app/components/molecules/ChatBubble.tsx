import { Message } from "@/app/lib/speech";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const alignmentClass = message.isUser ? "justify-end" : "justify-start";
  const bubbleClass = message.isUser
    ? "rounded-tr-sm bg-blue-500 text-white"
    : "rounded-tl-sm bg-zinc-100 text-foreground dark:bg-zinc-800";

  return (
    <div className={`flex ${alignmentClass}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${bubbleClass}`}>
        <p className="text-sm">{message.text}</p>
      </div>
    </div>
  );
}
