"use client";

import { useEffect, useRef, useState } from "react";
import { useAppShellProgression } from "@/app/design/templates/app-shell/useAppShellProgression";
import { ProgressionXpHistorySidebar } from "./ProgressionXpHistorySidebar";

export function ProgressionHistorySection() {
  const { setOpenProgressionHistory } = useAppShellProgression();
  const [open, setOpen] = useState(false);
  const openHistoryRef = useRef<() => void>(() => {
    setOpen(true);
  });

  useEffect(() => {
    openHistoryRef.current = () => {
      setOpen(true);
    };
  }, []);

  useEffect(() => {
    const openHistory = () => {
      openHistoryRef.current();
    };

    setOpenProgressionHistory(() => openHistory);

    return () => {
      setOpenProgressionHistory(null);
    };
  }, [setOpenProgressionHistory]);

  return (
    <ProgressionXpHistorySidebar
      open={open}
      onClose={() => {
        setOpen(false);
      }}
    />
  );
}
