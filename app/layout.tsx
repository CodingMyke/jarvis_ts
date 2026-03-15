import type { Metadata } from "next";
import "./globals.css";
import { JARVIS_CONFIG } from "@/app/_features/assistant";

export const metadata: Metadata = {
  title: `${JARVIS_CONFIG.assistantName} AI Chatbot`,
  description: "AI Chatbot Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
