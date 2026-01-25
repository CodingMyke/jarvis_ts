import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Message } from "@/app/lib/speech";

interface ChatBubbleProps {
  message: Message;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-sm space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-sm space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  code: ({ className, children }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    ) : (
      <code className={`${className} text-xs`}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-zinc-200 dark:bg-zinc-700 p-2 rounded-lg mb-2 overflow-x-auto text-xs">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-400 pl-2 italic text-sm mb-2">
      {children}
    </blockquote>
  ),
};

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
        {message.text && (
          message.isUser ? (
            <p className="text-sm">{message.text}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.text}
            </ReactMarkdown>
          )
        )}
      </div>
    </div>
  );
}
