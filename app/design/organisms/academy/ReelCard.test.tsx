// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReelCard } from "./ReelCard";

const reel = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  status: "idea" as const,
  origin: "manual" as const,
  idea: "First draft idea",
  title: null,
  caption: null,
  body: null,
  hashtags: null,
  last_idea_generation_run_id: null,
  generation_status: "not_generated" as const,
  notes: null,
  scheduled_at: null,
  published_at: null,
  created_at: "2026-05-11T08:00:00.000Z",
  updated_at: "2026-05-11T08:00:00.000Z",
};

describe("ReelCard", () => {
  it("opens edit from the card title and hides the old status and edit action", () => {
    const onEdit = vi.fn();

    render(
      <ReelCard
        reel={reel}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
      />,
    );

    const card = screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111");
    fireEvent.click(card);

    expect(onEdit).toHaveBeenCalledWith(reel);
    expect(screen.queryByText("idea")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete reel" })).toBeInTheDocument();
    expect(card.children).toHaveLength(2);
    expect(card.firstElementChild?.tagName).toBe("SPAN");
    expect(within(card).getByText("First draft idea")).toBeInTheDocument();
    expect(within(card).getByTitle("First draft idea")).toBeInTheDocument();
  });

  it("does not open edit when a drag interaction just finished", () => {
    const onEdit = vi.fn();
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <ReelCard
        reel={reel}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />,
    );

    const card = screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111");

    fireEvent.dragStart(card);
    fireEvent.dragEnd(card);
    fireEvent.click(card);

    expect(onDragStart).toHaveBeenCalledWith(reel.id);
    expect(onDragEnd).toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
