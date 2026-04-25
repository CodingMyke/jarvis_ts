"use client";

import { useEffect } from "react";
import { AppSidebar } from "@/app/design/organisms/navigation/AppSidebar";

export interface AppMobileSidebarProps {
  isOpen: boolean;
  currentPathname: string;
  onClose: () => void;
}

export function AppMobileSidebar({
  isOpen,
  currentPathname,
  onClose,
}: AppMobileSidebarProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onClose]);

  return (
    <div
      className={[
        "fixed inset-0 z-40 md:hidden",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className={[
          "absolute inset-0 bg-black/50 transition-opacity duration-(--transition-fast)",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
        aria-label="Chiudi navigazione"
        onClick={onClose}
      />

      <div
        className={[
          "relative h-full transition-transform duration-(--transition-fast)",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <AppSidebar currentPathname={currentPathname} onNavigate={onClose} variant="mobile" />
      </div>
    </div>
  );
}
