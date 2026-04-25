# Dashboard Calendar Events Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents are available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show calendar events on `/dashboard` with the same calendar logic and interactions as `/assistant`, add explicit empty/error states, and move the calendar setup link from dashboard to settings.

**Architecture:** Keep `/assistant` untouched. Build a dashboard-specific calendar rendering flow that reuses the existing calendar store + `CalendarPanel` interactions, while adding explicit server-load error signaling for `/dashboard` only. Keep App Router pages thin and place behavior in feature/design modules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Zustand, Tailwind CSS 4, Vitest, React Testing Library.

---

## Agreed Scope (Frozen)

- Dashboard must show calendar events only (no to-do block for now).
- Calendar logic must match assistant behavior (same 7-day range, same grouping, same panel interactions, same delete behavior).
- `/assistant` must remain exactly as-is.
- Dashboard UI must be left-aligned (no centered main content).
- Empty state text on dashboard: `Nessun evento nei prossimi 7 giorni`.
- Error state text on dashboard (instead of empty): `Si è verificato un errore`.
- If events are present, events are shown even when an error exists in background state.
- Remove setup link from dashboard and add a very simple section in settings with the setup CTA.
- No extra variants in this implementation.

## File Map

**Create**
- `app/design/templates/dashboard/DashboardCalendarTemplate.tsx`
- `app/design/templates/dashboard/useDashboardCalendarWorkspace.ts`

**Modify**
- `app/(app-shell)/dashboard/page.tsx`
- `app/design/index.ts`
- `app/design/organisms/auth/SettingsPanel.tsx`
- `app/_features/calendar/lib/actions.ts`
- `app/_features/calendar/index.ts`
- `app/design/auth-ui.test.tsx`
- `README.md`

**Create or Modify (tests)**
- `app/design/dashboard-ui.test.tsx` (new) or extend an existing design test file if preferred by current patterns

### Task 1: Add dashboard-safe calendar server loading with explicit error signal

**Files:**
- Modify: `app/_features/calendar/lib/actions.ts`
- Modify: `app/_features/calendar/index.ts`

- [x] Add a new server action dedicated to dashboard loading that returns both grouped `days` and a boolean `hasError` (without changing existing `fetchCalendarEvents` behavior used by assistant).
- [x] Reuse existing calendar service + mapper path (`getCalendarService` + `groupCalendarEventsByDay`) so grouping logic stays identical.
- [x] Keep fallback behavior deterministic: on failure return `days: []` and `hasError: true`.
- [x] Export the new action via `app/_features/calendar/index.ts` for clean feature-boundary imports.

### Task 2: Build dashboard calendar client workspace (store bootstrap + delete interactions)

**Files:**
- Create: `app/design/templates/dashboard/DashboardCalendarTemplate.tsx`
- Create: `app/design/templates/dashboard/useDashboardCalendarWorkspace.ts`

- [x] Create a dashboard client template responsible for rendering calendar content and dashboard-specific empty/error states.
- [x] Bootstrap calendar store from SSR `initialEvents` in a dedicated dashboard hook (without importing assistant-specific bootstrapping that also handles tasks/timer).
- [x] Reuse the same delete flow semantics used in assistant:
  - call `deleteCalendarEvent`
  - apply optimistic mutation with `applyEventMutationResult({ removedEventId })`
  - schedule `refreshCalendar()` with the same delay strategy already used.
- [x] Compute state priority in UI:
  - show `CalendarPanel` when at least one event exists
  - else show `Si è verificato un errore` when load error exists
  - else show `Nessun evento nei prossimi 7 giorni`.
- [x] Keep layout left-aligned and width based on content needs (no centered container behavior).

### Task 3: Wire dashboard page to use identical 7-day calendar window + new template

**Files:**
- Modify: `app/(app-shell)/dashboard/page.tsx`
- Modify: `app/design/index.ts`

- [x] Replace current dashboard setup-link-only content with SSR calendar loading flow.
- [x] Use the same time window logic as assistant page (`now` to `now + 7 days`).
- [x] Pass `initialEvents` and `initialLoadError` to dashboard template.
- [x] Remove setup link from dashboard completely.
- [x] Export new dashboard template from `app/design/index.ts` only if needed by current import conventions.

### Task 4: Move calendar setup CTA to settings with a minimal section

**Files:**
- Modify: `app/design/organisms/auth/SettingsPanel.tsx`

- [x] Add a very simple `Integrazioni` section in settings.
- [x] Add a clear CTA link/button to `/setup/calendar` in that section.
- [x] Keep the existing account + logout behavior unchanged.
- [x] Keep the section simple (no extra options/variants).

### Task 5: Update documentation

**Files:**
- Modify: `README.md`

- [x] Update routing/discovery note that currently says `/setup/calendar` is discoverable from dashboard.
- [x] Document that setup calendar entrypoint is now in `/settings`.
- [x] Update dashboard description in README to reflect events list behavior (including empty/error messaging at high level if the README currently describes dashboard behavior).

### Task 6: Add/adjust tests and run verification

**Files:**
- Create/Modify: `app/design/dashboard-ui.test.tsx`
- Modify: `app/design/auth-ui.test.tsx`

- [x] Add dashboard UI tests for the three rendering states:
  - events present -> calendar panel visible
  - no events + no error -> `Nessun evento nei prossimi 7 giorni`
  - no events + error -> `Si è verificato un errore`.
- [x] Add a test that confirms settings renders the `/setup/calendar` CTA in authenticated state.
- [x] Ensure dashboard test setup mocks preserve existing calendar interaction contracts (do not re-test CalendarPanel internals already covered elsewhere).
- [x] Run targeted tests first:
  - `npm run test -- app/design/dashboard-ui.test.tsx app/design/auth-ui.test.tsx`
- [x] Run full project verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
- [x] If failures surface, fix only issues inside this frozen scope and rerun verification before completion.
