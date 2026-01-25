import type { Metadata } from "next";
import "./globals.css";
import { TimerProvider } from "@/app/components/organisms";

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
        <TimerProvider>{children}</TimerProvider>
      </body>
    </html>
  );
}
