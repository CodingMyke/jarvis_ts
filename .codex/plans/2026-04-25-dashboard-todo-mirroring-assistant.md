# Dashboard ToDo Mirroring Assistant - Implementation Plan

**Goal:** Add a `ToDo` section to `/dashboard` by reusing the same task behavior already used in `/assistant`, with always-visible section title, explicit empty/error states, and responsive side-by-side layout with calendar.

## Agreed decisions (frozen)

- Dashboard must show `Eventi` and `ToDo` side by side on wide screens.
- When space is not enough, sections must wrap (responsive fallback).
- `ToDo` title must always be visible.
- If there are no tasks, show `Non ci sono elementi`.
- If tasks load fails, show `Si è verificato un errore`.
- Dashboard task interactions must stay active (toggle + delete), same as Assistant behavior.
- Dashboard ToDo block must not show the internal `Cose da fare` header.

## File map

- Modify: `app/(app-shell)/dashboard/page.tsx`
- Modify: `app/_features/tasks/lib/actions.ts`
- Modify: `app/_features/tasks/index.ts`
- Create: `app/design/templates/dashboard/DashboardTodoTemplate.tsx`
- Create: `app/design/templates/dashboard/useDashboardTasksWorkspace.ts`
- Create: `app/design/organisms/tasks/DashboardTodoPanel.tsx`
- Modify: `app/design/templates/dashboard/DashboardCalendarTemplate.tsx`
- Modify: `app/design/index.ts` (if needed by current exports)
- Modify: `app/design/dashboard-ui.test.tsx`
- Modify: `app/_features/tasks/lib/actions.test.ts`
- Modify: `README.md`

## Tasks

- [x] Add a dashboard-specific tasks server action in `app/_features/tasks/lib/actions.ts` returning `{ todos, hasError }` without changing current `fetchTasks()` contract used by Assistant.
- [x] Export the new dashboard tasks action (and related type) in `app/_features/tasks/index.ts` to keep imports aligned with feature boundaries.
- [x] Update `app/(app-shell)/dashboard/page.tsx` to SSR-load calendar and dashboard tasks in parallel and pass both initial payloads to dashboard templates.
- [x] Create `app/design/templates/dashboard/useDashboardTasksWorkspace.ts` to initialize the tasks store from SSR data and derive a reliable `hasLoadError` state from `initialLoadError` + store status transitions.
- [x] Create `app/design/organisms/tasks/DashboardTodoPanel.tsx` that reuses store logic from Assistant (`todos`, `update`, `remove`) but renders only the list (no internal title/header).
- [x] Create `app/design/templates/dashboard/DashboardTodoTemplate.tsx` with fixed section title `ToDo`, state priority `hasTodos -> panel`, otherwise `error -> Si è verificato un errore`, else `Non ci sono elementi`.
- [x] Update dashboard layout so calendar and todo sections are side by side when possible and automatically wrap when horizontal space is insufficient.
- [x] Align visual dimensions/spacing so `ToDo` block is coherent with existing dashboard calendar block and remains readable on mobile.
- [x] Update `app/design/index.ts` exports only if required by current import pattern in dashboard page/template usage.
- [x] Update `README.md` dashboard section to include the new ToDo block and its empty/error behavior.
- [x] Extend `app/_features/tasks/lib/actions.test.ts` and `app/design/dashboard-ui.test.tsx` to cover dashboard tasks loading + UI states/interactions, then run verification (`npm run lint`, `npm run typecheck`, targeted tests, and full `npm run test`) fixing only regressions inside this scope.
