"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppMobileSidebar } from "@/app/design/organisms/navigation/AppMobileSidebar";
import { AppSidebar } from "@/app/design/organisms/navigation/AppSidebar";
import { AppTopbar } from "@/app/design/organisms/navigation/AppTopbar";

export interface AppShellTemplateProps {
  children: ReactNode;
}

export function AppShellTemplate({ children }: AppShellTemplateProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const currentPathname = pathname ?? "/dashboard";

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-background">
      <div className="fixed left-0 top-0 z-20 hidden md:block">
        <AppSidebar currentPathname={currentPathname} />
      </div>

      <AppMobileSidebar
        isOpen={isMobileSidebarOpen}
        currentPathname={currentPathname}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 md:pl-56">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppTopbar
            currentPathname={currentPathname}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
