// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcademyPage from "@/app/(app-shell)/academy/page";
import { ReelBoardTemplate } from "@/app/design/templates/academy/ReelBoardTemplate";
import type { ReelBoard } from "@/app/_features/academy/reels";

const academyUiMocks = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
  getAuthContext: vi.fn(),
  createReel: vi.fn(),
  deleteReel: vi.fn(),
  getServerReelBoard: vi.fn(),
  updateReel: vi.fn(),
  updateReelStatus: vi.fn(),
  generateReelFields: vi.fn(),
  generateReelField: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: academyUiMocks.redirect,
}));

vi.mock("@/app/_server", async () => {
  const actual = await vi.importActual<typeof import("@/app/_server")>("@/app/_server");

  return {
    ...actual,
    getAuthContext: academyUiMocks.getAuthContext,
  };
});

vi.mock("@/app/_features/academy/reels", async () => {
  const actual = await vi.importActual<typeof import("@/app/_features/academy/reels")>(
    "@/app/_features/academy/reels",
  );

  return {
    ...actual,
    createReel: academyUiMocks.createReel,
    deleteReel: academyUiMocks.deleteReel,
    getServerReelBoard: academyUiMocks.getServerReelBoard,
    updateReel: academyUiMocks.updateReel,
    updateReelStatus: academyUiMocks.updateReelStatus,
    generateReelFields: academyUiMocks.generateReelFields,
    generateReelField: academyUiMocks.generateReelField,
  };
});

function expectNoLegacyRoundedUtility(element: HTMLElement) {
  expect(element.className).not.toMatch(/(^|\s)rounded-(?!app\b|round\b)[^\s]+(?=\s|$)/);
}

const boardFixture: ReelBoard = {
  columns: {
    ai_idea: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "ai_idea",
        origin: "ai_idea_generation",
        idea: "AI generated candidate",
        title: "AI generated candidate",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
        last_idea_generation_run_id: "99999999-9999-4999-8999-999999999999",
        created_at: "2026-05-11T07:00:00.000Z",
        updated_at: "2026-05-11T07:00:00.000Z",
      },
    ],
    idea: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "idea",
        origin: "manual",
        idea: "First draft idea",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
        last_idea_generation_run_id: null,
        created_at: "2026-05-11T08:00:00.000Z",
        updated_at: "2026-05-11T08:00:00.000Z",
      },
    ],
    script: [],
    to_record: [],
    to_edit: [],
    ready: [],
    published: [
      {
        id: "33333333-3333-4333-8333-333333333331",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "published",
        origin: "manual",
        idea: "Published one",
        title: "Published one",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: "2026-05-10T10:00:00.000Z",
        last_idea_generation_run_id: null,
        created_at: "2026-05-10T09:00:00.000Z",
        updated_at: "2026-05-10T10:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333332",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "published",
        origin: "manual",
        idea: "Published two",
        title: "Published two",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: "2026-05-09T10:00:00.000Z",
        last_idea_generation_run_id: null,
        created_at: "2026-05-09T09:00:00.000Z",
        updated_at: "2026-05-09T10:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "published",
        origin: "manual",
        idea: "Published three",
        title: "Published three",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: "2026-05-08T10:00:00.000Z",
        last_idea_generation_run_id: null,
        created_at: "2026-05-08T09:00:00.000Z",
        updated_at: "2026-05-08T10:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333334",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "published",
        origin: "manual",
        idea: "Published four",
        title: "Published four",
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: "2026-05-07T10:00:00.000Z",
        last_idea_generation_run_id: null,
        created_at: "2026-05-07T09:00:00.000Z",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
    ],
  },
  count: 6,
};

describe("academy design", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", academyUiMocks.fetch);
    academyUiMocks.getAuthContext.mockResolvedValue(null);
    academyUiMocks.getServerReelBoard.mockResolvedValue({
      success: true,
      board: boardFixture,
    });
    academyUiMocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, board: boardFixture }),
    });
  });

  it("redirects the academy landing page to dashboard", () => {
    expect(() => AcademyPage()).toThrow("redirected");
    expect(academyUiMocks.redirect).toHaveBeenCalledWith("/academy/dashboard");
  });

  it("renders an explicit dashboard placeholder", async () => {
    const { default: AcademyDashboardPage } = await import(
      "@/app/(app-shell)/academy/dashboard/page"
    );

    render(<AcademyDashboardPage />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.getByText("Placeholder esplicito: la dashboard Academy arriva nel prossimo step."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Academy")).not.toBeInTheDocument();
  });

  it("renders the reel board using the server-loaded initial board", async () => {
    academyUiMocks.getAuthContext.mockResolvedValue({
      supabase: {} as never,
      userId: "user-1",
    });
    const { default: AcademyReelsPage } = await import("@/app/(app-shell)/academy/reels/page");
    const page = await AcademyReelsPage();

    render(page);

    expect(screen.getByRole("heading", { name: "Reel board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reel board" }).className).toContain("text-4xl");
    expect(
      screen.getByText("Plan, refine, move, and publish your reels from one editorial workspace."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Academy")).not.toBeInTheDocument();
    expectNoLegacyRoundedUtility(
      screen.getByRole("heading", { name: "Reel board" }).closest("section") as HTMLElement,
    );
    expect(screen.getAllByText("First draft idea")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "AI Idea" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate AI ideas" })).toBeInTheDocument();
    expect(academyUiMocks.getServerReelBoard).toHaveBeenCalledWith({}, "user-1");
  });

  it("shows a clear error when manual idea generation is already running", async () => {
    academyUiMocks.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: "FLOW_ALREADY_RUNNING",
        message: "Idea generation already running",
      }),
    });

    render(<ReelBoardTemplate initialBoard={boardFixture} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate AI ideas" }));
    });

    expect(await screen.findByText("Idea generation already running")).toBeInTheDocument();
  });

  it("renders an explicit courses placeholder", async () => {
    const { default: AcademyCoursesPage } = await import("@/app/(app-shell)/academy/courses/page");

    render(<AcademyCoursesPage />);

    expect(screen.getByRole("heading", { name: "Corsi" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder esplicito: i corsi arrivano nel prossimo step."))
      .toBeInTheDocument();
    expect(screen.queryByText("Academy")).not.toBeInTheDocument();
  });

  it("renders an explicit published reels placeholder", async () => {
    const { default: AcademyPublishedPage } = await import(
      "@/app/(app-shell)/academy/reels/published/page"
    );

    render(<AcademyPublishedPage />);

    expect(screen.getByRole("heading", { name: "Reel pubblicati" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder esplicito: l'archivio pubblicati arriva nel prossimo step."))
      .toBeInTheDocument();
    expect(screen.queryByText("Academy")).not.toBeInTheDocument();
  });

  it("creates, edits, moves, deletes reels, and caps published cards to three", async () => {
    academyUiMocks.createReel.mockResolvedValue({
      success: true,
      reel: {
        id: "44444444-4444-4444-8444-444444444444",
        user_id: "22222222-2222-4222-8222-222222222222",
        status: "idea",
        origin: "manual",
        idea: "Created idea",
        title: null,
        caption: null,
        body: null,
        hashtags: null,
        generation_status: "not_generated",
        notes: null,
        scheduled_at: null,
        published_at: null,
        last_idea_generation_run_id: null,
        created_at: "2026-05-11T12:00:00.000Z",
        updated_at: "2026-05-11T12:00:00.000Z",
      },
    });
    academyUiMocks.updateReel.mockResolvedValue({
      success: true,
      reel: {
        ...boardFixture.columns.idea[0],
        title: "Updated title",
        body: "Updated body",
        updated_at: "2026-05-11T13:00:00.000Z",
      },
    });
    academyUiMocks.updateReelStatus.mockResolvedValue({
      success: true,
      reel: {
        ...boardFixture.columns.idea[0],
        status: "ready",
        title: "Updated title",
        body: "Updated body",
        updated_at: "2026-05-11T14:00:00.000Z",
      },
    });
    academyUiMocks.deleteReel.mockResolvedValue({
      success: true,
      reelId: "11111111-1111-4111-8111-111111111111",
    });
    academyUiMocks.generateReelFields.mockResolvedValue({ success: true });
    academyUiMocks.generateReelField.mockResolvedValue({ success: true });

    render(<ReelBoardTemplate initialBoard={boardFixture} />);

    expect(screen.getByRole("heading", { name: "Reel board" })).toBeInTheDocument();
    expectNoLegacyRoundedUtility(screen.getByTestId("reel-column-idea"));
    expectNoLegacyRoundedUtility(screen.getByPlaceholderText("Write the core idea for the reel"));
    expect(screen.getByRole("link", { name: "Vedi tutti" })).toHaveAttribute(
      "href",
      "/academy/reels/published",
    );
    expect(screen.queryByText("Published four")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111")).queryByText("idea"),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111")).queryByRole(
        "button",
        { name: "Edit" },
      ),
    ).not.toBeInTheDocument();

    const quickCreateInput = screen.getByPlaceholderText("Write the core idea for the reel");
    fireEvent.change(quickCreateInput, {
      target: { value: "Created idea" },
    });
    await act(async () => {
      fireEvent.submit(quickCreateInput.closest("form") as HTMLFormElement);
    });
    expect(await screen.findByTestId("reel-card-44444444-4444-4444-8444-444444444444"))
      .toBeInTheDocument();

    const draftCard = screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111");
    fireEvent.click(draftCard);
    expectNoLegacyRoundedUtility(screen.getByLabelText("Title"));
    expectNoLegacyRoundedUtility(screen.getByRole("button", { name: "Save changes" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated title" } });
    fireEvent.change(screen.getByLabelText("Body"), { target: { value: "Updated body" } });
    expect(screen.getByRole("button", { name: "Generate all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate caption" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate body" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate hashtags" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate title" }));
    });
    expect(academyUiMocks.updateReel).toHaveBeenCalled();
    expect(academyUiMocks.generateReelField).toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(await screen.findByText("Updated title")).toBeInTheDocument();
    expect(screen.queryByText("idea")).not.toBeInTheDocument();
    expect(within(draftCard).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("reel-card-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();

    fireEvent.dragStart(draftCard);
    await act(async () => {
      fireEvent.drop(screen.getByTestId("reel-column-ready"));
    });
    expect(await within(screen.getByTestId("reel-column-ready")).findByText("Updated title"))
      .toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId("reel-card-11111111-1111-4111-8111-111111111111"))
        .getByRole("button", { name: "Delete reel" }),
    );
    expectNoLegacyRoundedUtility(screen.getByRole("button", { name: "Confirm delete" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    });
    expect(screen.queryByText("Updated title")).not.toBeInTheDocument();
  });
});
