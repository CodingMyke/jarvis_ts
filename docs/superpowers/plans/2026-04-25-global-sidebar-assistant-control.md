# Global Sidebar Assistant Control Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent assistant control in the app-shell sidebar logo box (`Jarvis / Personal OS`) so users can toggle `idle <-> wake_word`, preserve session while navigating shell pages, and show state via logo border color.

**Architecture:** Move assistant runtime ownership to a single app-shell-level client provider that wraps `AppShellTemplate`, then consume that state in `AppSidebar` for UI control and border styling. Keep existing `useVoiceChat` behavior intact (wake word, connected flow, inactivity timeout, chat persistence), and only change control surface (logo box button instead of link). Keep `/assistant` route untouched and out of scope.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5 strict mode, Zustand stores, Vitest + Testing Library, ESLint.

---

## Scope Check

This is one subsystem (global assistant UI control + shell persistence), so one plan is enough. Route-aware tooling ("which page am I on") is explicitly deferred.

## Implementation Constraints

- Follow DRY + YAGNI: no new assistant features, no route tool in this step.
- Keep all code/comments/commits in English.
- Keep `/assistant` as-is (ignore for this change).
- Keep startup behavior `idle` after reload.
- No navigation on logo click.
- Desktop and mobile sidebar must share the same assistant state.

## File Structure Map

**Create**
- `app/design/templates/app-shell/AppShellAssistantProvider.tsx`  
  Single source of truth for app-shell assistant runtime state and actions.
- `app/design/templates/app-shell/useAppShellAssistant.ts`  
  Small consumer hook that reads provider context.
- `app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`  
  Unit tests for toggle behavior, border mapping, and tool refresh side effects.

**Modify**
- `app/design/templates/app-shell/AppShellTemplate.tsx`  
  Wrap shell with the assistant provider so state persists across page navigation.
- `app/design/organisms/navigation/AppSidebar.tsx`  
  Replace logo `Link` with `button`, bind click to assistant toggle, apply dynamic border class.
- `app/design/app-shell-ui.test.tsx`  
  UI tests for sidebar logo button semantics and visual state classes.
- `README.md`  
  Update startup/control UX docs from “orb click” to “sidebar logo click” for shell experience.

---

### Task 1: Build App-Shell Assistant Provider (TDD)

**Files:**
- Create: `app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`
- Create: `app/design/templates/app-shell/AppShellAssistantProvider.tsx`
- Create: `app/design/templates/app-shell/useAppShellAssistant.ts`

- [x] **Step 1: Write the failing provider tests**

```tsx
// app/design/templates/app-shell/AppShellAssistantProvider.test.tsx
// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShellAssistantProvider } from "./AppShellAssistantProvider";
import { useAppShellAssistant } from "./useAppShellAssistant";

const providerMocks = vi.hoisted(() => ({
  useVoiceChat: vi.fn(),
  calendarRefresh: vi.fn(),
  tasksRefresh: vi.fn(),
}));

vi.mock("@/app/_features/assistant/hooks/useVoiceChat", () => ({
  useVoiceChat: providerMocks.useVoiceChat,
}));

vi.mock("@/app/_features/calendar/state/calendar.store", () => ({
  useCalendarStore: (selector: (state: { refresh: () => Promise<void> }) => unknown) =>
    selector({ refresh: providerMocks.calendarRefresh }),
}));

vi.mock("@/app/_features/tasks/state/tasks.store", () => ({
  useTasksStore: (selector: (state: { refresh: () => Promise<void> }) => unknown) =>
    selector({ refresh: providerMocks.tasksRefresh }),
}));

describe("AppShellAssistantProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    providerMocks.calendarRefresh.mockReset();
    providerMocks.tasksRefresh.mockReset();
    providerMocks.useVoiceChat.mockReset();

    providerMocks.calendarRefresh.mockResolvedValue(undefined);
    providerMocks.tasksRefresh.mockResolvedValue(undefined);

    providerMocks.useVoiceChat.mockReturnValue({
      listeningMode: "idle",
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });
  });

  it("toggles idle -> wake and wake/connected -> idle", () => {
    const { result, rerender } = renderHook(() => useAppShellAssistant(), {
      wrapper: ({ children }) => <AppShellAssistantProvider>{children}</AppShellAssistantProvider>,
    });

    expect(result.current.logoBorderClassName).toBe("border-white/10");

    act(() => {
      result.current.onLogoToggle();
    });

    expect(providerMocks.useVoiceChat.mock.results[0]?.value.startListening).toHaveBeenCalledOnce();

    providerMocks.useVoiceChat.mockReturnValue({
      listeningMode: "wake_word",
      startListening: vi.fn(),
      stopListening: vi.fn(),
    });

    rerender();

    expect(result.current.logoBorderClassName).toBe("border-amber-400/80");

    act(() => {
      result.current.onLogoToggle();
    });

    expect(providerMocks.useVoiceChat.mock.results[1]?.value.stopListening).toHaveBeenCalledOnce();
  });

  it("refreshes calendar/tasks only for successful mutation tools", async () => {
    const { result } = renderHook(() => useAppShellAssistant(), {
      wrapper: ({ children }) => <AppShellAssistantProvider>{children}</AppShellAssistantProvider>,
    });

    const providerOptions = providerMocks.useVoiceChat.mock.calls[0]?.[0];

    act(() => {
      providerOptions?.onToolExecuted?.("createCalendarEvent", { success: true });
      providerOptions?.onToolExecuted?.("createTodo", { success: true });
      providerOptions?.onToolExecuted?.("createTodo", { success: false });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.listeningMode).toBe("idle");
    expect(providerMocks.calendarRefresh).toHaveBeenCalledOnce();
    expect(providerMocks.tasksRefresh).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Run provider tests to verify failure**

Run: `npm run test -- app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`  
Expected: FAIL (`Cannot find module` for provider/hook files).

- [x] **Step 3: Implement provider and consumer hook (minimal pass)**

```tsx
// app/design/templates/app-shell/AppShellAssistantProvider.tsx
"use client";

import { createContext, useCallback, useMemo, type ReactNode } from "react";
import { useVoiceChat } from "@/app/_features/assistant/hooks/useVoiceChat";
import {
  isCalendarMutationTool,
  isSuccessfulToolResult,
  isTaskMutationTool,
} from "@/app/_features/assistant/lib/tool-effects";
import { useCalendarStore } from "@/app/_features/calendar/state/calendar.store";
import { useTasksStore } from "@/app/_features/tasks/state/tasks.store";
import type { AssistantSessionState } from "@/app/_features/assistant/lib";

export interface AppShellAssistantContextValue {
  listeningMode: AssistantSessionState;
  logoBorderClassName: string;
  onLogoToggle: () => void;
}

export const AppShellAssistantContext = createContext<AppShellAssistantContextValue | null>(null);

function getLogoBorderClassName(listeningMode: AssistantSessionState): string {
  if (listeningMode === "wake_word") return "border-amber-400/80";
  if (listeningMode === "connected") return "border-cyan-400/80";
  return "border-white/10";
}

export function AppShellAssistantProvider({ children }: { children: ReactNode }) {
  const refreshCalendar = useCalendarStore((state) => state.refresh);
  const refreshTasks = useTasksStore((state) => state.refresh);

  const handleToolExecuted = useCallback(
    (toolName: string, result: unknown) => {
      if (!isSuccessfulToolResult(result)) {
        return;
      }

      if (isCalendarMutationTool(toolName)) {
        setTimeout(() => {
          void refreshCalendar();
        }, 500);
      }

      if (isTaskMutationTool(toolName)) {
        setTimeout(() => {
          void refreshTasks();
        }, 300);
      }
    },
    [refreshCalendar, refreshTasks],
  );

  const { listeningMode, startListening, stopListening } = useVoiceChat({
    onToolExecuted: handleToolExecuted,
  });

  const value = useMemo<AppShellAssistantContextValue>(
    () => ({
      listeningMode,
      logoBorderClassName: getLogoBorderClassName(listeningMode),
      onLogoToggle: () => {
        if (listeningMode === "idle") {
          startListening();
          return;
        }

        stopListening();
      },
    }),
    [listeningMode, startListening, stopListening],
  );

  return (
    <AppShellAssistantContext.Provider value={value}>
      {children}
    </AppShellAssistantContext.Provider>
  );
}
```

```tsx
// app/design/templates/app-shell/useAppShellAssistant.ts
"use client";

import { useContext, type ContextType } from "react";
import { AppShellAssistantContext } from "./AppShellAssistantProvider";

export function useAppShellAssistant(): NonNullable<ContextType<typeof AppShellAssistantContext>> {
  const context = useContext(AppShellAssistantContext);

  if (!context) {
    throw new Error("useAppShellAssistant must be used within AppShellAssistantProvider");
  }

  return context;
}
```

- [x] **Step 4: Run provider tests to verify pass**

Run: `npm run test -- app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`  
Expected: PASS (`2 passed`).

- [ ] **Step 5: Commit Task 1**

```bash
git add app/design/templates/app-shell/AppShellAssistantProvider.tsx app/design/templates/app-shell/useAppShellAssistant.ts app/design/templates/app-shell/AppShellAssistantProvider.test.tsx
git commit -m "feat: add app-shell assistant provider and toggle controller"
```

---

### Task 2: Wire Provider Into Shell Layout (TDD)

**Files:**
- Modify: `app/design/templates/app-shell/AppShellTemplate.tsx`
- Test: `app/design/app-shell-ui.test.tsx`

- [x] **Step 1: Add failing layout test coverage for provider-wrapped shell rendering**

```tsx
// app/design/app-shell-ui.test.tsx (add assertion in existing shell render test)
expect(screen.getByTestId("app-sidebar-desktop")).toBeInTheDocument();
expect(screen.getByTestId("app-shell-topbar")).toBeInTheDocument();
```

Then add a safety test:

```tsx
it("renders app shell without throwing provider errors", () => {
  expect(() =>
    render(
      <AppShellTemplate>
        <div>Content</div>
      </AppShellTemplate>,
    ),
  ).not.toThrow();
});
```

- [ ] **Step 2: Run app-shell UI tests to verify failure (if provider not wired yet)**

Run: `npm run test -- app/design/app-shell-ui.test.tsx`  
Expected: FAIL after adding provider-dependent sidebar behavior (in Task 3) if wrapper is missing.

- [x] **Step 3: Wrap shell UI with provider in template**

```tsx
// app/design/templates/app-shell/AppShellTemplate.tsx
import { AppShellAssistantProvider } from "./AppShellAssistantProvider";

export function AppShellTemplate({ children }: AppShellTemplateProps) {
  // existing pathname + mobile sidebar state/effects

  return (
    <AppShellAssistantProvider>
      <div className="flex h-dvh max-h-dvh overflow-hidden bg-background">
        {/* existing sidebar/mobile/topbar/main layout unchanged */}
      </div>
    </AppShellAssistantProvider>
  );
}
```

- [x] **Step 4: Run app-shell UI tests to verify pass**

Run: `npm run test -- app/design/app-shell-ui.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add app/design/templates/app-shell/AppShellTemplate.tsx app/design/app-shell-ui.test.tsx
git commit -m "refactor: mount assistant provider at app-shell root"
```

---

### Task 3: Convert Sidebar Logo to Assistant Toggle Button (TDD)

**Files:**
- Modify: `app/design/organisms/navigation/AppSidebar.tsx`
- Modify: `app/design/app-shell-ui.test.tsx`

- [x] **Step 1: Add failing sidebar tests for button semantics, no navigation, and border states**

```tsx
// app/design/app-shell-ui.test.tsx
const appShellAssistantMocks = vi.hoisted(() => ({
  listeningMode: "idle",
  logoBorderClassName: "border-white/10",
  onLogoToggle: vi.fn(),
}));

vi.mock("@/app/design/templates/app-shell/useAppShellAssistant", () => ({
  useAppShellAssistant: () => appShellAssistantMocks,
}));

it("renders logo control as button and toggles assistant without navigation", () => {
  render(<AppSidebar currentPathname="/dashboard" />);

  const logoButton = screen.getByTestId("app-sidebar-logo-toggle");
  expect(logoButton.tagName).toBe("BUTTON");
  expect(logoButton).toHaveClass("border-white/10");

  fireEvent.click(logoButton);
  expect(appShellAssistantMocks.onLogoToggle).toHaveBeenCalledOnce();
});

it("applies wake-word and connected border colors", () => {
  appShellAssistantMocks.listeningMode = "wake_word";
  appShellAssistantMocks.logoBorderClassName = "border-amber-400/80";

  const { rerender } = render(<AppSidebar currentPathname="/dashboard" />);
  expect(screen.getByTestId("app-sidebar-logo-toggle")).toHaveClass("border-amber-400/80");

  appShellAssistantMocks.listeningMode = "connected";
  appShellAssistantMocks.logoBorderClassName = "border-cyan-400/80";

  rerender(<AppSidebar currentPathname="/dashboard" />);
  expect(screen.getByTestId("app-sidebar-logo-toggle")).toHaveClass("border-cyan-400/80");
});
```

- [ ] **Step 2: Run sidebar UI tests to verify failure**

Run: `npm run test -- app/design/app-shell-ui.test.tsx`  
Expected: FAIL (missing `app-sidebar-logo-toggle` and hook integration).

- [x] **Step 3: Implement sidebar logo button behavior**

```tsx
// app/design/organisms/navigation/AppSidebar.tsx
import { useAppShellAssistant } from "@/app/design/templates/app-shell/useAppShellAssistant";

export function AppSidebar({ currentPathname, onNavigate, variant = "desktop" }: AppSidebarProps) {
  const activeItem = getAppShellNavigationItemFromPath(currentPathname);
  const isDesktop = variant === "desktop";
  const {
    listeningMode,
    logoBorderClassName,
    onLogoToggle,
  } = useAppShellAssistant();

  const logoAriaLabel = listeningMode === "idle"
    ? "Attiva assistente vocale"
    : "Disattiva assistente vocale";

  return (
    <aside /* unchanged */>
      <div className="border-b border-white/10 p-4">
        <button
          type="button"
          data-testid="app-sidebar-logo-toggle"
          className={[
            "block w-full rounded-xl border bg-white/5 px-3 py-3 text-left transition-colors",
            "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent/20",
            logoBorderClassName,
          ].join(" ")}
          onClick={onLogoToggle}
          aria-label={logoAriaLabel}
        >
          <p className="text-lg font-semibold text-foreground">Jarvis</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Personal OS</p>
        </button>
      </div>

      {/* existing nav sections unchanged */}
    </aside>
  );
}
```

- [x] **Step 4: Run sidebar UI tests to verify pass**

Run: `npm run test -- app/design/app-shell-ui.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/design/organisms/navigation/AppSidebar.tsx app/design/app-shell-ui.test.tsx
git commit -m "feat: use sidebar logo box as global assistant toggle"
```

---

### Task 4: Update Docs + Full Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Update README assistant usage flow (orb -> sidebar logo control)**

```md
- Start: click the Jarvis/Personal OS logo box in the left sidebar.
- The assistant enters wake-word mode (yellow border), then connected mode (cyan border) after wake word.
- Click the same logo box at any time to force full idle/off mode.
- Assistant runtime persists across app-shell navigation and stops when leaving app-shell routes.
```

- [x] **Step 2: Run targeted tests**

Run: `npm run test -- app/design/templates/app-shell/AppShellAssistantProvider.test.tsx app/design/app-shell-ui.test.tsx`  
Expected: PASS.

- [x] **Step 3: Run lint**

Run: `npm run lint`  
Expected: PASS (no ESLint errors).

- [x] **Step 4: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS (no TS errors).

- [ ] **Step 5: Manual browser verification (required for UI/audio)**

Run: `npm run dev`  
Manual checks:
- Open `/dashboard`, click sidebar logo box once: assistant enters `wake_word` and logo border becomes yellow.
- Say wake word, ensure state reaches connected and logo border becomes cyan.
- Navigate to `/settings` or `/learning`, verify assistant stays active (no reset).
- Click logo while connected, verify immediate `idle` and border returns to `border-white/10`.
- Open mobile sidebar drawer, verify same border state and same toggle behavior; drawer remains open after click.

- [ ] **Step 6: Commit Task 4**

```bash
git add README.md
git commit -m "docs: document sidebar logo assistant control and state borders"
```

---

## Final Verification Checklist

- [x] No changes to `/assistant` route behavior.
- [ ] Assistant initial state remains `idle` after hard refresh.
- [x] Sidebar logo is a `button`, not a navigation `Link`.
- [x] Idle border: `border-white/10`; wake-word: `border-amber-400/80`; connected: `border-cyan-400/80`.
- [x] Click behavior: `idle -> startListening`; `wake_word/connected -> stopListening (idle)`.
- [ ] Shell-page navigation keeps assistant session alive.
- [x] Lint + typecheck + targeted tests all pass.

## Skills To Apply During Execution

- `@superpowers:executing-plans`
- `@superpowers:test-driven-development`
- `@superpowers:verification-before-completion`
- `@superpowers:requesting-code-review`
