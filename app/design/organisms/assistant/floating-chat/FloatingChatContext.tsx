"use client";

import { createContext, useMemo, useState, type ReactNode } from "react";

interface FloatingChatContextValue {
  isExpanded: boolean;
  isHovered: boolean;
  showControls: boolean;
  isDialogVisible: boolean;
  isDialogAnimatedIn: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  toggleExpanded: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  confirmDelete: () => void;
}

export const FloatingChatContext = createContext<FloatingChatContextValue | null>(null);

interface FloatingChatProviderProps {
  children: ReactNode;
  onDeleteChat?: () => void;
}

export function FloatingChatProvider({
  children,
  onDeleteChat,
}: FloatingChatProviderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dialogState, setDialogState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");

  const value = useMemo<FloatingChatContextValue>(
    () => ({
      isExpanded,
      isHovered,
      showControls: isHovered || isExpanded,
      isDialogVisible: dialogState !== "closed",
      isDialogAnimatedIn: dialogState === "open",
      handleMouseEnter: () => setIsHovered(true),
      handleMouseLeave: () => setIsHovered(false),
      toggleExpanded: () => setIsExpanded((current) => !current),
      openDeleteDialog: () => {
        setDialogState("opening");
        requestAnimationFrame(() => setDialogState("open"));
      },
      closeDeleteDialog: () => {
        setDialogState("closing");
        setTimeout(() => setDialogState("closed"), 300);
      },
      confirmDelete: () => {
        onDeleteChat?.();
        setIsExpanded(false);
        setDialogState("closing");
        setTimeout(() => setDialogState("closed"), 300);
      },
    }),
    [dialogState, isExpanded, isHovered, onDeleteChat],
  );

  return (
    <FloatingChatContext.Provider value={value}>
      {children}
    </FloatingChatContext.Provider>
  );
}
