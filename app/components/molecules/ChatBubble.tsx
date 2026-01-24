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
        {!message.isUser && message.thinking && (
          <details className="mb-2">
            <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
              💭 Ragionamento
            </summary>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 italic border-l-2 border-zinc-300 dark:border-zinc-600 pl-2">
              {message.thinking}
            </p>
          </details>
        )}
        {message.text && <p className="text-sm">{message.text}</p>}
      </div>
    </div>
  );
}
