// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProgressionCheckin,
  deleteProgressionGoal,
  getProgressionGoalDetails,
  getProgressionXpHistory,
  resolveProgressionDeadline,
  runProgressionGoalOperation,
  undoProgressionCheckin,
  updateProgressionGoal,
} from "@/app/_features/progression/lib/progression-client";
import { ProgressionPage } from "@/app/design/templates/progression/ProgressionPage";
import { ProgressionGoalFormDialog } from "@/app/design/organisms/progression/ProgressionGoalFormDialog";
import { ProgressionHistorySection } from "@/app/design/organisms/progression/ProgressionHistorySection";
import { ProgressionDeadlineReviewDialog } from "@/app/design/organisms/progression/ProgressionDeadlineReviewDialog";
import { ProgressionTodayPanel } from "@/app/design/organisms/progression/ProgressionTodayPanel";
import { ProgressionTemplate } from "@/app/design/templates/progression/ProgressionTemplate";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const shellProgressionState = vi.hoisted(() => ({
  hasProgressionDeadlineWarning: false,
  openProgressionHistory: null as (() => void) | null,
  setOpenProgressionHistory: vi.fn(),
}));

const pageSectionMocks = vi.hoisted(() => ({
  blockDeadline: false,
  suspendDeadline: false,
  suspendLevel: false,
  suspendGoals: false,
  suspendToday: false,
}));

function suspendForever(): never {
  throw new Promise(() => {});
}

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/app/design/templates/app-shell/useAppShellProgression", () => ({
  useAppShellProgression: () => shellProgressionState,
}));

vi.mock("@/app/_features/progression/lib/progression-client", () => ({
  createProgressionCheckin: vi.fn(),
  createProgressionGoal: vi.fn(),
  deleteProgressionGoal: vi.fn(),
  getProgressionGoalDetails: vi.fn(),
  getProgressionXpHistory: vi.fn(),
  resolveProgressionDeadline: vi.fn(),
  runProgressionGoalOperation: vi.fn(),
  undoProgressionCheckin: vi.fn(),
  updateProgressionGoal: vi.fn(),
}));

vi.mock("@/app/design/organisms/progression/ProgressionDeadlineSection", () => ({
  ProgressionDeadlineSection: ({ children }: { children: import("react").ReactNode }) => {
    if (pageSectionMocks.suspendDeadline) {
      suspendForever();
    }

    if (pageSectionMocks.blockDeadline) {
      return <div>Scadenza da risolvere</div>;
    }

    return <>{children}</>;
  },
}));

vi.mock("@/app/design/organisms/progression/ProgressionLevelSection", () => ({
  ProgressionLevelSection: () => {
    if (pageSectionMocks.suspendLevel) {
      suspendForever();
    }

    return <div data-testid="progression-level-section">level section</div>;
  },
}));

vi.mock("@/app/design/organisms/progression/ProgressionTodaySection", () => ({
  ProgressionTodaySection: () => {
    if (pageSectionMocks.suspendToday) {
      suspendForever();
    }

    return <div data-testid="progression-today-section">today section</div>;
  },
}));

vi.mock("@/app/design/organisms/progression/ProgressionGoalsSection", () => ({
  ProgressionGoalsSection: () => {
    if (pageSectionMocks.suspendGoals) {
      suspendForever();
    }

    return <div data-testid="progression-goals-section">goals section</div>;
  },
}));

const initialGoals = [
  {
    id: "goal-in-progress",
    title: "Ship progression UI",
    description: "Deliver the first usable progression workspace.",
    status: "in_progress",
    deadline: "2026-04-30",
    completion_xp: 25,
  },
  {
    id: "goal-to-start",
    title: "Review the weekly plan",
    description: "Prepare the backlog for next week.",
    status: "to_start",
    deadline: null,
    completion_xp: 15,
  },
  {
    id: "goal-completed",
    title: "Archive completed work",
    description: "Close the finished milestone.",
    status: "completed",
    deadline: null,
    completion_xp: 10,
  },
  {
    id: "goal-failed",
    title: "Fix the overdue goal",
    description: "Recover the blocked plan.",
    status: "failed",
    deadline: null,
    completion_xp: 8,
  },
];

const todayItems = [
  {
    id: "action-daily",
    title: "Daily polish",
    goalTitle: "Ship progression UI",
    xpValue: 5,
    checkinId: null,
  },
  {
    id: "action-done",
    title: "Evening review",
    goalTitle: "Ship progression UI",
    xpValue: 3,
    checkinId: "checkin-done",
  },
];

const weeklyItems = [
  {
    id: "action-weekly",
    title: "Weekly milestone",
    goalTitle: "Ship progression UI",
    xpValue: 12,
    checkinId: null,
  },
];

describe("progression page UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageSectionMocks.blockDeadline = false;
    pageSectionMocks.suspendDeadline = false;
    pageSectionMocks.suspendLevel = false;
    pageSectionMocks.suspendGoals = false;
    pageSectionMocks.suspendToday = false;
    shellProgressionState.openProgressionHistory = null;
    vi.mocked(createProgressionCheckin).mockResolvedValue({ success: true, checkin: { id: "checkin-1" } });
    vi.mocked(deleteProgressionGoal).mockResolvedValue({ success: true, goal: { id: "goal-1" } });
    vi.mocked(getProgressionGoalDetails).mockResolvedValue({
      success: true,
      goal: { id: "goal-in-progress" },
      actions: [
        {
          id: "action-1",
          title: "Daily polish",
          description: null,
          frequency_type: "daily",
          frequency_config: {},
          xp_per_checkin: 5,
          active: true,
        },
      ],
    });
    vi.mocked(getProgressionXpHistory).mockResolvedValue({
      success: true,
      history: [
        {
          id: "xp-1",
          xp_amount: 5,
          description: "Action check-in",
          created_at: "2026-04-29T10:30:00.000Z",
        },
        {
          id: "xp-2",
          xp_amount: -3,
          description: "Undo check-in",
          created_at: "2026-04-29T10:30:00.000Z",
        },
      ],
      count: 2,
    });
    vi.mocked(resolveProgressionDeadline).mockResolvedValue({
      success: true,
      goal: { id: "goal-expired" },
    });
    vi.mocked(runProgressionGoalOperation).mockResolvedValue({ success: true });
    vi.mocked(undoProgressionCheckin).mockResolvedValue({
      success: true,
      checkin: { id: "checkin-done" },
    });
    vi.mocked(updateProgressionGoal).mockResolvedValue({
      success: true,
      goal: { id: "goal-in-progress" },
    });
  });

  it("renders an independent fallback for the level section", () => {
    pageSectionMocks.suspendLevel = true;

    render(<ProgressionPage />);

    expect(screen.getByTestId("progression-level-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("progression-today-section")).toBeInTheDocument();
    expect(screen.getByTestId("progression-goals-section")).toBeInTheDocument();
  });

  it("renders an independent fallback for the goals section", () => {
    pageSectionMocks.suspendGoals = true;

    render(<ProgressionPage />);

    expect(screen.getByTestId("progression-goals-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("progression-level-section")).toBeInTheDocument();
    expect(screen.getByTestId("progression-today-section")).toBeInTheDocument();
  });

  it("renders an independent fallback for the today section", () => {
    pageSectionMocks.suspendToday = true;

    render(<ProgressionPage />);

    expect(screen.getByTestId("progression-today-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("progression-level-section")).toBeInTheDocument();
    expect(screen.getByTestId("progression-goals-section")).toBeInTheDocument();
  });

  it("blocks the rest of the page when deadline review needs attention", () => {
    pageSectionMocks.blockDeadline = true;

    render(<ProgressionPage />);

    expect(screen.getByText("Scadenza da risolvere")).toBeInTheDocument();
    expect(screen.queryByTestId("progression-level-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("progression-goals-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("progression-today-section")).not.toBeInTheDocument();
  });

  it("calls check-in and undo APIs from the today panels", async () => {
    render(
      <ProgressionTodayPanel
        initialTodayItems={todayItems}
        initialWeeklyItems={weeklyItems}
        timezone="Europe/Rome"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Completa Daily polish" }));
    fireEvent.click(screen.getByRole("button", { name: "Annulla Evening review" }));

    await waitFor(() => {
      expect(createProgressionCheckin).toHaveBeenCalledWith("action-daily");
      expect(undoProgressionCheckin).toHaveBeenCalledWith("checkin-done");
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps goal filters client-side and routes goal actions through split APIs", async () => {
    render(<ProgressionTemplate initialGoals={initialGoals} />);

    const inProgressFilter = screen.getByRole("button", { name: "In corso" });
    expect(inProgressFilter).toHaveAttribute("aria-pressed", "true");

    const inProgressCard = screen.getByTestId("progression-goal-goal-in-progress");
    fireEvent.click(
      within(inProgressCard).getByRole("button", {
        name: "Apri azioni obiettivo di Ship progression UI",
      }),
    );
    fireEvent.click(within(inProgressCard).getByRole("menuitem", { name: "Completa" }));

    await waitFor(() => {
      expect(runProgressionGoalOperation).toHaveBeenCalledWith({
        goalId: "goal-in-progress",
        operation: "complete",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Da iniziare" }));

    const toStartCard = screen.getByTestId("progression-goal-goal-to-start");
    fireEvent.click(
      within(toStartCard).getByRole("button", {
        name: "Apri azioni obiettivo di Review the weekly plan",
      }),
    );
    fireEvent.click(within(toStartCard).getByRole("menuitem", { name: "Elimina" }));

    await waitFor(() => {
      expect(deleteProgressionGoal).toHaveBeenCalledWith("goal-to-start");
    });
  });

  it("shows delete for failed goals with a separate destructive section", async () => {
    render(<ProgressionTemplate initialGoals={initialGoals} />);

    fireEvent.click(screen.getByRole("button", { name: "Falliti" }));

    const failedCard = screen.getByTestId("progression-goal-goal-failed");
    fireEvent.click(
      within(failedCard).getByRole("button", {
        name: "Apri azioni obiettivo di Fix the overdue goal",
      }),
    );

    expect(within(failedCard).getByRole("menuitem", { name: "Duplica" })).toBeInTheDocument();
    expect(within(failedCard).getByRole("menuitem", { name: "Modifica" })).toBeInTheDocument();
    expect(within(failedCard).getByRole("menuitem", { name: "Elimina" })).toBeInTheDocument();
  });

  it("loads goal details on demand and preserves recurring action ids during edit submit", async () => {
    render(<ProgressionTemplate initialGoals={initialGoals} />);

    const inProgressCard = screen.getByTestId("progression-goal-goal-in-progress");
    fireEvent.click(
      within(inProgressCard).getByRole("button", {
        name: "Apri azioni obiettivo di Ship progression UI",
      }),
    );
    fireEvent.click(within(inProgressCard).getByRole("menuitem", { name: "Modifica" }));

    await waitFor(() => {
      expect(getProgressionGoalDetails).toHaveBeenCalledWith("goal-in-progress");
      expect(screen.getByDisplayValue("Daily polish")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("Daily polish"), {
      target: { value: "Daily polish updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => {
      expect(updateProgressionGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "goal-in-progress",
          actions: [
            expect.objectContaining({
              id: "action-1",
              title: "Daily polish updated",
            }),
          ],
        }),
      );
    });
  });

  it("submits deadline review actions through the dedicated API", async () => {
    render(
      <ProgressionDeadlineReviewDialog
        goal={{
          id: "goal-expired",
          title: "Resolve the overdue deliverable",
          description: "Pick an outcome before resuming work.",
          deadline: "2026-04-28",
          canPostpone: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Segna completato" }));

    await waitFor(() => {
      expect(resolveProgressionDeadline).toHaveBeenCalledWith({
        goalId: "goal-expired",
        action: "complete",
      });
      expect(navigationMocks.refresh).toHaveBeenCalled();
    });
  });

  it("registers the history opener and loads XP history only when opened", async () => {
    render(<ProgressionHistorySection />);

    expect(getProgressionXpHistory).not.toHaveBeenCalled();
    expect(shellProgressionState.setOpenProgressionHistory).toHaveBeenCalled();

    const registeredHistorySetter = shellProgressionState.setOpenProgressionHistory.mock.calls[0]?.[0] as
      | (() => (() => void))
      | null;
    const openHistory = registeredHistorySetter ? registeredHistorySetter() : null;

    await act(async () => {
      openHistory?.();
    });

    await waitFor(() => {
      expect(getProgressionXpHistory).toHaveBeenCalledWith({ limit: 50, offset: 0 });
      expect(screen.getByText("+5 XP")).toBeInTheDocument();
      expect(screen.getByText("-3 XP")).toBeInTheDocument();
    });
  });

  it("keeps recurring action inputs mounted while editing their title", () => {
    render(
      <ProgressionGoalFormDialog
        open
        mode="edit"
        initialValue={{
          id: "goal-1",
          title: "Ship progression UI",
          description: "",
          deadline: "",
          completionXp: 25,
          startNow: true,
          status: "in_progress",
          actions: [
            {
              id: "action-1",
              title: "Daily polish",
              description: "",
              frequencyType: "daily",
              weekdays: [1, 3, 5],
              targetCount: 3,
              xpPerCheckin: 5,
              active: true,
            },
          ],
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const actionTitleInput = screen.getByPlaceholderText("Titolo azione");
    actionTitleInput.focus();

    fireEvent.change(actionTitleInput, { target: { value: "Daily polish updated" } });

    expect(actionTitleInput).toHaveValue("Daily polish updated");
    expect(actionTitleInput.isConnected).toBe(true);
    expect(document.activeElement).toBe(actionTitleInput);
  });

  it("shows create-specific actions and deadline XP warning in the goal dialog", () => {
    const onSubmit = vi.fn();

    render(
      <ProgressionGoalFormDialog
        open
        mode="create"
        initialValue={{
          title: "Ship progression UI",
          description: "",
          deadline: "2026-05-01",
          completionXp: 25,
          startNow: false,
          actions: [
            {
              id: "action-1",
              title: "Daily polish",
              description: "",
              frequencyType: "daily",
              weekdays: [1, 3, 5],
              targetCount: 3,
              xpPerCheckin: 5,
              active: true,
            },
          ],
        }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getAllByText("Titolo")).toHaveLength(2);
    expect(screen.getByText("Ricorrenza")).toBeInTheDocument();
    expect(screen.getByText("XP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aggiungi azione" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rimuovi azione Daily polish" })).toBeInTheDocument();
    expect(
      screen.getByText("Se fallisci questo obiettivo perderai 8 XP."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crea e inizia" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        startNow: true,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Crea" }));
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startNow: false,
      }),
    );
  });
});
