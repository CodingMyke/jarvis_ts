import type { ReactNode } from "react";
import { AppShellTemplate } from "@/app/design/templates/app-shell/AppShellTemplate";

export default function AppShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShellTemplate>{children}</AppShellTemplate>;
}
