import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Message } from "@/app/lib/speech";

interface ChatBubbleProps {
  message: Message;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 text-sm last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h1 className="mb-2 text-base font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 text-sm font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-bold">{children}</h3>,
  ul: ({ children }) => (
    <ul className="mb-2 list-inside list-disc space-y-1 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-inside list-decimal space-y-1 text-sm">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  code: ({ className, children }) => {
    const isInline = !className;
    return isInline ? (
      <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs text-accent">
        {children}
      </code>
    ) : (
      <code className={`${className} text-xs`}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-white/5 p-2 text-xs">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent underline transition-colors hover:text-accent-secondary"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-accent/50 pl-2 text-sm italic text-muted">
      {children}
    </blockquote>
  ),
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.isUser;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 ${
          isUser
            ? "rounded-tr-sm bg-accent/20 text-foreground"
            : "rounded-tl-sm bg-white/5 text-foreground"
        }`}
      >
        {!isUser && message.thinking && (
          <details className="mb-2">
            <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
              💭 Ragionamento
            </summary>
            <p className="mt-1 border-l-2 border-accent/30 pl-2 text-xs italic text-muted">
              {message.thinking}
            </p>
          </details>
        )}
        {message.text &&
          (isUser ? (
            <p className="text-sm">{message.text}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.text}
            </ReactMarkdown>
          ))}
      </div>
    </div>
  );
}
