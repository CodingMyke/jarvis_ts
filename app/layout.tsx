import type { Metadata } from "next";
import "./globals.css";
import { TimerProvider, TodoProvider } from "@/app/components/organisms";

export const metadata: Metadata = {
  title: "Jarvis AI Chatbot",
  description: "AI Chatbot Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <TimerProvider>
          <TodoProvider>{children}</TodoProvider>
        </TimerProvider>
      </body>
    </html>
  );
}
