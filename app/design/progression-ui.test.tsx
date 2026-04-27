// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProgressionPage from "@/app/(app-shell)/progression/page";

interface MockOverview {
  profile: {
    user_id: string;
    total_xp: number;
    level: number;
    timezone: string;
  };
  levelProgress: {
    level: number;
    totalXp: number;
    xpInCurrentLevel: number;
    xpRequiredForNextLevel: number;
    xpRemainingForNextLevel: number;
  };
  goals: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  checkins: Array<Record<string, unknown>>;
  expiredGoals: Array<Record<string, unknown>>;
  xpHistory: Array<Record<string, unknown>>;
  todayLocalDate: string;
  isoWeekday: number;
  weekStart: string;
  weekEnd: string;
  deadlineWarning: boolean;
}

interface MockStoreState {
  overview: MockOverview | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  initialized: boolean;
  history: Array<Record<string, unknown>>;
  historyStatus: "idle" | "loading" | "ready" | "error";
  deadlineWarning: boolean;
  initialize: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  ensureProfile: ReturnType<typeof vi.fn>;
  createGoal: ReturnType<typeof vi.fn>;
  updateGoal: ReturnType<typeof vi.fn>;
  runGoalOperation: ReturnType<typeof vi.fn>;
  deleteGoal: ReturnType<typeof vi.fn>;
  checkIn: ReturnType<typeof vi.fn>;
  undoCheckIn: ReturnType<typeof vi.fn>;
  resolveDeadline: ReturnType<typeof vi.fn>;
  loadHistory: ReturnType<typeof vi.fn>;
}

function createOverview(): MockOverview {
  return {
    profile: {
      user_id: "user-1",
      total_xp: 42,
      level: 3,
      timezone: "Europe/Rome",
    },
    levelProgress: {
      level: 3,
      totalXp: 42,
      xpInCurrentLevel: 4,
      xpRequiredForNextLevel: 52,
      xpRemainingForNextLevel: 48,
    },
    goals: [
      {
        id: "goal-in-progress",
        title: "Ship progression UI",
        description: "Deliver the first usable progression workspace.",
        status: "in_progress",
        deadline: "2026-04-30",
        completion_xp: 25,
        deadline_change_count: 0,
      },
      {
        id: "goal-to-start",
        title: "Review the weekly plan",
        description: "Prepare the backlog for next week.",
        status: "to_start",
        deadline: null,
        completion_xp: 15,
        deadline_change_count: 0,
      },
      {
        id: "goal-completed",
        title: "Archive completed work",
        description: "Close the finished milestone.",
        status: "completed",
        deadline: null,
        completion_xp: 10,
        deadline_change_count: 1,
      },
    ],
    actions: [
      {
        id: "action-daily",
        goal_id: "goal-in-progress",
        title: "Daily polish",
        description: "Review the active UI card states.",
        frequency_type: "daily",
        frequency_config: {},
        xp_per_checkin: 5,
        active: true,
      },
      {
        id: "action-done",
        goal_id: "goal-in-progress",
        title: "Evening review",
        description: "Undo path coverage.",
        frequency_type: "daily",
        frequency_config: {},
        xp_per_checkin: 3,
        active: true,
      },
      {
        id: "action-weekly",
        goal_id: "goal-in-progress",
        title: "Weekly milestone",
        description: "Complete the shared weekly target.",
        frequency_type: "weekly_count",
        frequency_config: { targetCount: 3 },
        xp_per_checkin: 12,
        active: true,
      },
      {
        id: "action-completed-goal",
        goal_id: "goal-completed",
        title: "Closed action",
        description: null,
        frequency_type: "daily",
        frequency_config: {},
        xp_per_checkin: 2,
        active: true,
      },
    ],
    checkins: [
      {
        id: "checkin-done",
        action_id: "action-done",
        local_date: "2026-04-29",
      },
      {
        id: "checkin-weekly-1",
        action_id: "action-weekly",
        local_date: "2026-04-27",
      },
    ],
    expiredGoals: [],
    xpHistory: [
      {
        id: "xp-1",
        xp_amount: 5,
        description: "Daily polish completed",
        created_at: "2026-04-29T08:00:00.000Z",
      },
    ],
    todayLocalDate: "2026-04-29",
    isoWeekday: 3,
    weekStart: "2026-04-27",
    weekEnd: "2026-05-03",
    deadlineWarning: false,
  };
}

const progressionUiMocks = vi.hoisted(() => ({
  storeState: {
    overview: createOverview(),
    status: "ready",
    error: null as string | null,
    initialized: true,
    history: [
      {
        id: "xp-1",
        xp_amount: 5,
        description: "Daily polish completed",
        created_at: "2026-04-29T08:00:00.000Z",
      },
    ],
    historyStatus: "ready",
    deadlineWarning: false,
    initialize: vi.fn(),
    refresh: vi.fn(),
    ensureProfile: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    runGoalOperation: vi.fn(),
    deleteGoal: vi.fn(),
    checkIn: vi.fn(),
    undoCheckIn: vi.fn(),
    resolveDeadline: vi.fn(),
    loadHistory: vi.fn(),
  } as MockStoreState,
}));

vi.mock("@/app/_features/progression/state/progression.store", () => ({
  useProgressionStore: (
    selector: (state: MockStoreState) => unknown,
  ) => selector(progressionUiMocks.storeState),
}));

describe("progression page UI", () => {
  beforeEach(() => {
    progressionUiMocks.storeState = {
      overview: createOverview(),
      status: "ready",
      error: null,
      initialized: true,
      history: [
        {
          id: "xp-1",
          xp_amount: 5,
          description: "Daily polish completed",
          created_at: "2026-04-29T08:00:00.000Z",
        },
      ],
      historyStatus: "ready",
      deadlineWarning: false,
      initialize: vi.fn(),
      refresh: vi.fn(),
      ensureProfile: vi.fn(),
      createGoal: vi.fn(),
      updateGoal: vi.fn(),
      runGoalOperation: vi.fn(),
      deleteGoal: vi.fn(),
      checkIn: vi.fn(),
      undoCheckIn: vi.fn(),
      resolveDeadline: vi.fn(),
      loadHistory: vi.fn(),
    };
  });

  it("renders a loading state while the progression overview is loading", () => {
    progressionUiMocks.storeState.status = "loading";
    progressionUiMocks.storeState.initialized = false;
    progressionUiMocks.storeState.overview = null;

    render(<ProgressionPage />);

    expect(screen.getByText("Caricamento progressione...")).toBeInTheDocument();
  });

  it("renders an error state when progression loading fails", () => {
    progressionUiMocks.storeState.status = "error";
    progressionUiMocks.storeState.error = "Overview failed";
    progressionUiMocks.storeState.overview = null;

    render(<ProgressionPage />);

    expect(screen.getByText("Overview failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();
  });

  it("renders the empty state when no in-progress goals are available", () => {
    progressionUiMocks.storeState.overview = {
      ...createOverview(),
      goals: [],
      actions: [],
      checkins: [],
    };

    render(<ProgressionPage />);

    expect(screen.getByText("Nessun obiettivo in corso.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuovo obiettivo" })).toBeInTheDocument();
  });

  it("shows level details and splits today work from the weekly queue", () => {
    render(<ProgressionPage />);

    expect(screen.getByText("XP totali")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Livello 3")).toBeInTheDocument();
    expect(screen.getByText("48 XP rimanenti")).toBeInTheDocument();

    const todayPanel = screen.getByTestId("progression-today-panel");
    expect(within(todayPanel).getByText("Daily polish")).toBeInTheDocument();
    expect(within(todayPanel).queryByText("Weekly milestone")).not.toBeInTheDocument();

    const weeklyPanel = screen.getByTestId("progression-weekly-panel");
    expect(within(weeklyPanel).getByText("Weekly milestone")).toBeInTheDocument();
  });

  it("calls check-in and undo actions from the today panels", () => {
    render(<ProgressionPage />);

    fireEvent.click(screen.getByRole("button", { name: "Completa Daily polish" }));
    fireEvent.click(screen.getByRole("button", { name: "Annulla Evening review" }));

    expect(progressionUiMocks.storeState.checkIn).toHaveBeenCalledWith("action-daily");
    expect(progressionUiMocks.storeState.undoCheckIn).toHaveBeenCalledWith("checkin-done");
  });

  it("defaults goal filters to in-progress and limits lifecycle actions by status", () => {
    render(<ProgressionPage />);

    const inProgressFilter = screen.getByRole("button", { name: "In corso" });
    expect(inProgressFilter).toHaveAttribute("aria-pressed", "true");

    const inProgressCard = screen.getByTestId("progression-goal-goal-in-progress");
    expect(within(inProgressCard).getByRole("button", { name: "Completa" })).toBeInTheDocument();
    expect(
      within(inProgressCard).getByRole("button", { name: "Segna fallito" }),
    ).toBeInTheDocument();
    expect(within(inProgressCard).queryByRole("button", { name: "Avvia" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Da iniziare" }));

    const toStartCard = screen.getByTestId("progression-goal-goal-to-start");
    expect(within(toStartCard).getByRole("button", { name: "Avvia" })).toBeInTheDocument();
    expect(within(toStartCard).queryByRole("button", { name: "Completa" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completati" }));

    const completedCard = screen.getByTestId("progression-goal-goal-completed");
    expect(within(completedCard).getByRole("button", { name: "Duplica" })).toBeInTheDocument();
    expect(within(completedCard).queryByRole("button", { name: "Avvia" })).not.toBeInTheDocument();
    expect(
      within(completedCard).queryByRole("button", { name: "Segna fallito" }),
    ).not.toBeInTheDocument();
  });

  it("blocks the progression workspace until an expired deadline is resolved", () => {
    progressionUiMocks.storeState.overview = {
      ...createOverview(),
      expiredGoals: [
        {
          id: "goal-expired",
          title: "Resolve the overdue deliverable",
          description: "Pick an outcome before resuming work.",
          status: "in_progress",
          deadline: "2026-04-28",
          completion_xp: 18,
          deadline_change_count: 0,
        },
      ],
      deadlineWarning: true,
    };
    progressionUiMocks.storeState.deadlineWarning = true;

    render(<ProgressionPage />);

    expect(screen.getByText("Scadenza da risolvere")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Segna completato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conferma fallimento" })).toBeInTheDocument();
    expect(screen.queryByTestId("progression-today-panel")).not.toBeInTheDocument();
  });

  it("opens the XP history sidebar on demand", () => {
    render(<ProgressionPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cronologia XP" }));

    expect(progressionUiMocks.storeState.loadHistory).toHaveBeenCalledWith({
      limit: 30,
      offset: 0,
    });
    expect(screen.getByTestId("progression-xp-history")).toBeInTheDocument();
    expect(screen.getByText("Daily polish completed")).toBeInTheDocument();
  });
});
