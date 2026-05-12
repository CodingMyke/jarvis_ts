"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EventDot } from "@/app/design/atoms/calendar/EventDot";
import { EventDeleteActions } from "@/app/design/molecules/calendar/EventDeleteActions";
import { EventItemDetails } from "@/app/design/molecules/calendar/EventItemDetails";
import { EventItemHeader } from "@/app/design/molecules/calendar/EventItemHeader";
import type { DeleteCalendarEventHandler, UICalendarEvent } from "@/app/_features/calendar";
import { useCalendarPanelContext } from "./useCalendarPanelContext";
import { useCalendarEventCardInteractions } from "./useCalendarEventCardInteractions";

interface CalendarEventCardProps {
  event: UICalendarEvent;
  onDeleteEvent?: DeleteCalendarEventHandler;
}

function CalendarEventCardComponent({
  event,
  onDeleteEvent,
}: CalendarEventCardProps) {
  const { expandedEventId, toggleEvent, collapseEvent } = useCalendarPanelContext();
  const isExpanded = expandedEventId === event.id;
  const [dialogState, setDialogState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const isDialogVisible = dialogState !== "closed";
  const isDialogAnimatedIn = dialogState === "open";
  const {
    containerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleClick,
  } = useCalendarEventCardInteractions(event.id, isExpanded, isDialogVisible, toggleEvent);

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
      className={`event-item-container cursor-pointer select-none rounded-app transition-[transform,opacity,background-color,border-color,box-shadow,backdrop-filter,max-width,padding] duration-(--transition-medium) ease-(--easing-smooth) ${
        isExpanded ? "event-expanded relative z-10 max-w-104 p-4" : "max-w-full p-0"
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <EventDot color={event.color} isExpanded={isExpanded} />

        <div className="min-w-0 flex-1">
          <EventItemHeader event={event} isExpanded={isExpanded} />
          <EventItemDetails event={event} isExpanded={isExpanded} />

          {isExpanded && onDeleteEvent ? (
            <EventDeleteActions
              eventTitle={event.title}
              onDelete={(event) => {
                event.stopPropagation();
                setDeleteError(null);
                setDialogState("opening");
                requestAnimationFrame(() => setDialogState("open"));
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            />
          ) : null}
        </div>
      </div>

      {isDialogVisible && portalTarget
        ? createPortal(
            <div
              className={`fixed inset-0 z-[100] flex items-center justify-center transition-[background-color,backdrop-filter] duration-(--transition-fast) ${
                isDialogAnimatedIn
                  ? "bg-scrim-strong backdrop-blur-sm"
                  : "bg-black/0 backdrop-blur-0"
              }`}
              style={{ willChange: isDialogAnimatedIn ? "backdrop-filter" : "auto" }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                closeDeleteDialog();
              }}
            >
              <div
                className={`mx-4 w-full max-w-sm rounded-app border border-line bg-overlay p-6 shadow-overlay backdrop-blur-xl transition-[transform,opacity] duration-(--transition-fast) ${
                  isDialogAnimatedIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
                style={{ willChange: isDialogAnimatedIn ? "transform, opacity" : "auto" }}
                onClick={(event) => event.stopPropagation()}
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

                {deleteError ? (
                  <p className="mb-4 rounded-app border border-line-danger bg-danger-tint px-3 py-2 text-sm text-danger-copy">
                    {deleteError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    disabled={isDeleting}
                    className="rounded-app px-4 py-2 text-sm text-copy-muted transition-colors hover:bg-interactive hover:text-copy disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onDeleteEvent || isDeleting) {
                        return;
                      }

                      setIsDeleting(true);
                      setDeleteError(null);

                      try {
                        const result = await onDeleteEvent(event.id);

                        if (result.success) {
                          setDialogState("closed");
                          collapseEvent(event.id);
                          return;
                        }

                        setDeleteError(
                          result.errorMessage || "Errore durante l'eliminazione dell'evento.",
                        );
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting}
                    className="rounded-app bg-danger-tint px-4 py-2 text-sm text-danger transition-colors hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
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

export const CalendarEventCard = memo(CalendarEventCardComponent);
