"use client";

import {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { TrashIcon } from "@/app/_shared";
import type { DeleteCalendarEventHandler } from "@/app/_features/calendar/lib/ui-events";

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  color?: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

interface EventItemProps {
  event: CalendarEvent;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onDeleteEvent?: DeleteCalendarEventHandler;
}

function useEventItem(
  event: CalendarEvent,
  isExpanded: boolean,
  onToggle: (id: string) => void,
  isDeleteDialogVisible: boolean,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);

  const handleMouseDown = useCallback(() => {
    pressedRef.current = true;
    containerRef.current?.classList.add("event-pressed");
  }, []);

  const handleMouseUp = useCallback(() => {
    pressedRef.current = false;
    containerRef.current?.classList.remove("event-pressed");
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pressedRef.current) {
      pressedRef.current = false;
      containerRef.current?.classList.remove("event-pressed");
    }
  }, []);

  const handleClick = useCallback(() => {
    onToggle(event.id);
  }, [event.id, onToggle]);

  useEffect(() => {
    if (!isExpanded || isDeleteDialogVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Ignora click su altri EventItem - lascia che onClick gestisca il cambio
      if (target.closest?.(".event-item-container")) {
        return;
      }
      
      if (containerRef.current && !containerRef.current.contains(target)) {
        onToggle(event.id);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, isDeleteDialogVisible, event.id, onToggle]);

  return {
    containerRef,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleClick,
  };
}

function EventItemComponent({
  event,
  isExpanded,
  onToggle,
  onDeleteEvent,
}: EventItemProps) {
  const accentColor = useMemo(() => event.color || "var(--accent)", [event.color]);
  const [dialogState, setDialogState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const isDialogVisible = dialogState !== "closed";
  const isDialogAnimatedIn = dialogState === "open";
  const { containerRef, handleMouseDown, handleMouseUp, handleMouseLeave, handleClick } =
    useEventItem(event, isExpanded, onToggle, isDialogVisible);

  const showFooter = Boolean(onDeleteEvent);

  const closeDeleteDialog = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setDialogState("closing");
    setTimeout(() => {
      setDialogState("closed");
      setDeleteError(null);
    }, 300);
  }, [isDeleting]);

  const openDeleteDialog = useCallback(() => {
    setDeleteError(null);
    setDialogState("opening");
    requestAnimationFrame(() => setDialogState("open"));
  }, []);

  const handleDeleteButtonClick = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      openDeleteDialog();
    },
    [openDeleteDialog]
  );

  const handleDeleteButtonMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!onDeleteEvent || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await onDeleteEvent(event.id);

      if (result.success) {
        setDialogState("closed");
        return;
      }

      setDeleteError(result.errorMessage || "Errore durante l'eliminazione dell'evento.");
    } finally {
      setIsDeleting(false);
    }
  }, [event.id, isDeleting, onDeleteEvent]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isExpanded && isDialogVisible) {
      setDialogState("closed");
      setDeleteError(null);
      setIsDeleting(false);
    }
  }, [isDialogVisible, isExpanded]);

  return (
    <div
      ref={containerRef}
      data-event-id={event.id}
      className={`
        event-item-container cursor-pointer select-none
        rounded-xl
        transition-[transform,opacity,background-color,border-color,box-shadow,backdrop-filter,max-width,padding] duration-(--transition-medium) ease-(--easing-smooth)
        ${isExpanded ? "event-expanded p-4 z-10 relative max-w-104" : "p-0 max-w-full"}
      `}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {/* Pallino - si ingrandisce quando espanso */}
        <div
          className={`
            shrink-0 rounded-full
            transition-[width,height,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth)
            ${isExpanded ? "h-3 w-3" : "h-2 w-2"}
          `}
          style={{ backgroundColor: accentColor }}
        />

        <div className="min-w-0 flex-1">
          {/* Header: tempo e titolo */}
          <div
            className={`
              transition-[opacity,gap] duration-(--transition-medium) ease-(--easing-smooth)
              ${isExpanded ? "flex flex-col gap-1" : "flex items-baseline gap-2"}
            `}
          >
            <span
              className={`
                shrink-0 text-muted
                transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth)
                ${isExpanded ? "text-base font-medium" : "text-sm"}
              `}
            >
              {event.time}
              {event.endTime && ` - ${event.endTime}`}
            </span>
            <span
              className={`
                text-foreground
                transition-[font-size,opacity] duration-(--transition-medium) ease-(--easing-smooth)
                ${isExpanded ? "text-lg font-semibold" : "text-base truncate"}
              `}
            >
              {event.title}
            </span>
          </div>

          {/* Descrizione - sempre visibile ma stile cambia */}
          {event.description && (
            <p
              className={`
                text-muted/80
                transition-[font-size,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth)
                ${isExpanded ? "mt-3 text-base line-clamp-none" : "mt-0.5 text-sm line-clamp-2"}
              `}
            >
              {event.description}
            </p>
          )}

          {/* Dettagli extra - appaiono solo quando espanso */}
          <div
            className={`
              overflow-hidden
              transition-[max-height,margin-top,opacity] duration-(--transition-medium) ease-(--easing-smooth)
              ${isExpanded ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"}
            `}
          >
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted/70 mb-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{event.location}</span>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted/70">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                <span>{event.attendees.join(", ")}</span>
              </div>
            )}

            {showFooter && (
              <div className="mt-3 flex items-center justify-end gap-3 border-t border-white/10 pt-2">
                {onDeleteEvent && (
                  <button
                    type="button"
                    onClick={handleDeleteButtonClick}
                    onMouseDown={handleDeleteButtonMouseDown}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/10 hover:text-red-400"
                    aria-label={`Elimina evento ${event.title}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    <span>Elimina</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isDialogVisible && portalTarget
        ? createPortal(
            <div
              className={`fixed inset-0 z-[100] flex items-center justify-center transition-[background-color,backdrop-filter] duration-(--transition-fast) ${
                isDialogAnimatedIn
                  ? "bg-black/60 backdrop-blur-sm"
                  : "bg-black/0 backdrop-blur-0"
              }`}
              style={{ willChange: isDialogAnimatedIn ? "backdrop-filter" : "auto" }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                closeDeleteDialog();
              }}
            >
              <div
                className={`mx-4 w-full max-w-sm rounded-2xl border border-white/20 bg-black/80 p-6 shadow-2xl backdrop-blur-xl transition-[transform,opacity] duration-(--transition-fast) ${
                  isDialogAnimatedIn
                    ? "scale-100 opacity-100"
                    : "scale-95 opacity-0"
                }`}
                style={{ willChange: isDialogAnimatedIn ? "transform, opacity" : "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  Elimina evento
                </h3>
                <p className="mb-2 text-sm text-muted">
                  Stai per eliminare <span className="text-foreground">{event.title}</span>.
                </p>
                <p className="mb-6 text-sm text-muted">
                  L&apos;evento verrà rimosso dal calendario e non potrà essere recuperato.
                </p>

                {deleteError && (
                  <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {deleteError}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    disabled={isDeleting}
                    className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    disabled={isDeleting}
                    className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? "Eliminazione..." : "Elimina evento"}
                  </button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}

export const EventItem = memo(EventItemComponent, (prev, next) => {
  return (
    prev.event.id === next.event.id &&
    prev.event.title === next.event.title &&
    prev.event.time === next.event.time &&
    prev.event.endTime === next.event.endTime &&
    prev.event.description === next.event.description &&
    prev.event.location === next.event.location &&
    prev.event.color === next.event.color &&
    prev.event.attendees?.length === next.event.attendees?.length &&
    prev.isExpanded === next.isExpanded &&
    prev.onToggle === next.onToggle &&
    prev.onDeleteEvent === next.onDeleteEvent
  );
});
