# Progression System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if
> subagents are explicitly requested by the user) or superpowers:executing-plans to
> implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 autonomous progression system described in
`docs/progression-system-spec.md`.

**Architecture:** Add a dedicated `app/_features/progression` domain with Supabase-backed
state, server route handlers, a small client store, and app-shell deadline/profile
bootstrap. Keep Google Tasks separate, keep App Router/API files thin, and centralize
XP, date, frequency, and lifecycle rules in progression-owned modules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Zod, Zustand, Supabase,
Vitest, Tailwind CSS.

---

## Analysis Result

The spec is coherent enough to implement. No blocking contradictions found.

Implementation assumptions to make explicit:

- Enable `/progression` in the app-shell navigation as part of v1.
- Store recurring action configs as:
  - `daily`: `{}`
  - `specific_weekdays`: `{ "weekdays": [1, 3, 5] }`, ISO weekdays where Monday is `1`
    and Sunday is `7`
  - `weekly_count`: `{ "targetCount": 3 }`
- Store lifecycle timestamps as `timestamptz`; store deadlines and check-in local dates as
  `date`.
- Derive streaks from check-ins in service responses for v1. Do not persist streak counters yet.
- Create the profile with the browser timezone from the app shell. A settings UI for changing
  timezone is out of v1 unless explicitly requested later.
- Use PostgreSQL RPCs for atomic XP mutations and idempotent check-in mutations.

## Files

Create:

- `supabase/migrations/20260427000000_create_progression_system.sql`
- `app/_features/progression/index.ts`
- `app/_features/progression/server/progression.types.ts`
- `app/_features/progression/server/progression-leveling.ts`
- `app/_features/progression/server/progression-dates.ts`
- `app/_features/progression/server/progression-frequency.ts`
- `app/_features/progression/server/progression-route.schemas.ts`
- `app/_features/progression/server/progression.service.ts`
- `app/_features/progression/server/progression-route.handlers.ts`
- `app/_features/progression/server/*.test.ts`
- `app/_features/progression/lib/progression-client.ts`
- `app/_features/progression/state/progression.store.ts`
- `app/_features/progression/state/progression.store.test.ts`
- `app/api/progression/route.ts`
- `app/api/progression/profile/route.ts`
- `app/api/progression/goals/route.ts`
- `app/api/progression/check-ins/route.ts`
- `app/api/progression/deadlines/route.ts`
- `app/api/progression/xp-history/route.ts`
- `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- `app/design/templates/app-shell/useAppShellProgression.ts`
- `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`
- `app/design/templates/progression/ProgressionTemplate.tsx`
- `app/design/templates/progression/useProgressionWorkspace.ts`
- `app/design/organisms/progression/ProgressionTodayPanel.tsx`
- `app/design/organisms/progression/ProgressionGoalList.tsx`
- `app/design/organisms/progression/ProgressionGoalFormDialog.tsx`
- `app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx`
- `app/design/organisms/progression/ProgressionXpHistorySidebar.tsx`
- `app/design/molecules/progression/ProgressionLevelPanel.tsx`
- `app/design/progression-ui.test.tsx`

Modify:

- `app/(app-shell)/progression/page.tsx`
- `app/design/templates/app-shell/AppShellTemplate.tsx`
- `app/design/organisms/navigation/AppSidebar.tsx`
- `app/design/organisms/navigation/AppMobileSidebar.tsx` if sidebar props need widening
- `app/_features/navigation/app-shell-navigation.ts`
- `app/design/app-shell-ui.test.tsx`
- `app/api/core-routes.test.ts`
- `app/_server/supabase/database.types.ts`
- `README.md`
- `docs/progression-system-spec.md` only if implementation clarifies accepted assumptions

---

### Task 1: Create Implementation Branch

**Files:** none

- [x] **Step 1: Check current git status**

Run: `git status --short`

Expected: note existing user changes and do not revert unrelated work.

- [x] **Step 2: Create a dedicated branch**

Run: `git checkout -b codex/progression-system`

Expected: branch switches to `codex/progression-system`.

- [x] **Step 3: Commit only this task if there are plan-only changes**

Run: `git add docs/superpowers/plans/2026-04-27-progression-system.md`

Run: `git commit -m "docs: plan progression system implementation"`

Expected: commit succeeds if this plan is not already committed.

---

### Task 2: Add Supabase Schema And Atomic RPCs

**Files:**

- Create: `supabase/migrations/20260427000000_create_progression_system.sql`
- Modify: `app/_server/supabase/database.types.ts`

- [x] **Step 1: Write a failing database expectation**

Add a short manual checklist at the top of the migration task while implementing:

```sql
-- Expected after reset:
-- select to_regclass('public.progression_profiles') is not null;
-- select to_regclass('public.progression_goals') is not null;
-- select to_regclass('public.progression_actions') is not null;
-- select to_regclass('public.progression_checkins') is not null;
-- select to_regclass('public.progression_xp_history') is not null;
```

- [x] **Step 2: Create tables**

Migration responsibilities:

- `progression_profiles`: one row per user, `total_xp >= 0`, `level >= 1`, timezone,
  timestamps.
- `progression_goals`: user-owned goals, status check, optional deadline, XP, lifecycle
  timestamps, deadline change count, soft deletion.
- `progression_actions`: recurring actions owned by a goal, frequency type/config, XP,
  active/deactivated timestamps.
- `progression_checkins`: one action completion per local date, unique on
  `(action_id, local_date)`.
- `progression_xp_history`: immutable non-zero XP event log.

Use `gen_random_uuid()`, `auth.users(id)` foreign keys, indexes for user/status/deadline,
and row-level security policies scoped to `auth.uid()`.

- [x] **Step 3: Add atomic RPCs**

Create SQL functions with `security invoker` unless testing proves `security definer` is
required:

- `progression_ensure_profile(p_timezone text)`
- `progression_record_xp(p_xp_amount int, p_description text, p_goal_id uuid,
  p_action_id uuid, p_checkin_id uuid)`
- `progression_create_checkin(p_action_id uuid, p_local_date date, p_timezone text,
  p_description text)`
- `progression_undo_checkin(p_checkin_id uuid, p_local_date date, p_timezone text,
  p_description text)`
- `progression_complete_goal(p_goal_id uuid, p_description text)`
- `progression_fail_goal(p_goal_id uuid, p_description text)`

Each RPC must use `auth.uid()`, lock the profile row before changing XP, clamp XP at `0`,
recompute level, and skip XP history when the actual XP delta is `0`.

- [x] **Step 4: Run migration locally**

Run: `supabase db reset`

Expected: migration applies cleanly.

- [x] **Step 5: Regenerate Supabase types**

Run: `npm run gen-supabase-types`

Expected: `app/_server/supabase/database.types.ts` includes all progression tables and RPCs.

Note: remote generation required `SUPABASE_ACCESS_TOKEN`, so types were generated locally after
`supabase db reset` and merged into the existing generated remote type file.

- [x] **Step 6: Commit**

Run: `git add supabase/migrations app/_server/supabase/database.types.ts`

Run: `git commit -m "feat: add progression database schema"`

Expected: commit succeeds.

---

### Task 3: Implement Domain Types, Leveling, Dates, And Frequency Rules

**Files:**

- Create: `app/_features/progression/server/progression.types.ts`
- Create: `app/_features/progression/server/progression-leveling.ts`
- Create: `app/_features/progression/server/progression-dates.ts`
- Create: `app/_features/progression/server/progression-frequency.ts`
- Create: matching `*.test.ts` files

- [x] **Step 1: Write leveling tests**

Cover:

- Level 1 starts at `0` XP.
- Level 2 starts after `10` XP.
- Level 3 starts after `38` total XP.
- Negative XP input is treated as `0`.

Run: `npm run test -- app/_features/progression/server/progression-leveling.test.ts`

Expected: FAIL before implementation.

- [x] **Step 2: Implement leveling helpers**

Public helpers:

- `getXpRequiredForNextLevel(level: number): number`
- `getLevelFromTotalXp(totalXp: number): number`
- `getLevelProgress(totalXp: number)`

Use `round(10 * level ** 1.5)` and keep level minimum at `1`.

- [x] **Step 3: Write date/frequency tests**

Cover:

- Browser timezone local date formatting.
- ISO weekday mapping Monday `1` through Sunday `7`.
- Deadline expiration after the end of the local deadline day.
- Daily, specific weekdays, and weekly-count due rules.
- Weekly-count target reached prevents extra due items.

Run: `npm run test -- app/_features/progression/server/progression-dates.test.ts`

Run: `npm run test -- app/_features/progression/server/progression-frequency.test.ts`

Expected: FAIL before implementation.

- [x] **Step 4: Implement date/frequency helpers**

Keep functions pure and independent from Supabase:

- `getLocalDateForTimezone(date: Date, timezone: string): string`
- `getIsoWeekdayForTimezone(date: Date, timezone: string): number`
- `getWeekRangeForLocalDate(localDate: string): { start: string; end: string }`
- `isDeadlineExpired(deadline: string | null, todayLocalDate: string): boolean`
- `parseFrequencyConfig(frequencyType, frequencyConfig)`
- `isActionDueToday(action, todayContext)`
- `isWeeklyCountAvailable(action, weekCheckins)`

- [x] **Step 5: Run tests**

Run: `npm run test -- app/_features/progression/server/progression-leveling.test.ts`

Run: `npm run test -- app/_features/progression/server/progression-dates.test.ts`

Run: `npm run test -- app/_features/progression/server/progression-frequency.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

Run: `git add app/_features/progression/server`

Run: `git commit -m "feat: add progression domain rules"`

Expected: commit succeeds.

---

### Task 4: Add Route Schemas And Server Service

**Files:**

- Create: `app/_features/progression/server/progression-route.schemas.ts`
- Create: `app/_features/progression/server/progression.service.ts`
- Create: tests for schemas and service
- Create: `app/_features/progression/index.ts`

- [x] **Step 1: Write schema tests**

Cover trimming, required goal title, non-negative XP, valid status transitions, frequency
configs, UUID validation, and deadline review payloads.

Run: `npm run test -- app/_features/progression/server/progression-route.schemas.test.ts`

Expected: FAIL before implementation.

- [x] **Step 2: Implement Zod schemas**

Export schemas for:

- Profile ensure/update timezone.
- Overview query filter.
- Goal create/update/duplicate/start/complete/delete.
- Recurring action input.
- Check-in create/undo.
- Deadline review action.
- XP history query.

- [x] **Step 3: Write service tests**

Mock Supabase builders and RPC calls. Cover:

- Profile ensure.
- Overview loads profile, goals, actions, check-ins, deadlines, and history.
- Create/start/edit/duplicate/delete goal rules.
- Closed goals only edit title/description.
- Deadline change count enforcement.
- Action locking after first check-in.
- Idempotent check-in create and undo.
- Deadline completion/failure/postpone.

Run: `npm run test -- app/_features/progression/server/progression.service.test.ts`

Expected: FAIL before implementation.

- [x] **Step 4: Implement service**

Public service API:

- `ensureProgressionProfile(supabase, timezone)`
- `getProgressionOverview(supabase, userId, options)`
- `createProgressionGoal(supabase, userId, input)`
- `updateProgressionGoal(supabase, userId, input)`
- `duplicateProgressionGoal(supabase, userId, goalId)`
- `startProgressionGoal(supabase, userId, goalId)`
- `completeProgressionGoal(supabase, userId, goalId)`
- `softDeleteProgressionGoal(supabase, userId, goalId)`
- `createProgressionCheckin(supabase, userId, actionId)`
- `undoProgressionCheckin(supabase, userId, checkinId)`
- `resolveExpiredProgressionGoal(supabase, userId, input)`
- `getProgressionXpHistory(supabase, userId, options)`

Use stable result unions: `{ success: true; ... } | { success: false; error: string }`.

- [x] **Step 5: Run tests**

Run: `npm run test -- app/_features/progression/server`

Expected: PASS.

- [x] **Step 6: Commit**

Run: `git add app/_features/progression`

Run: `git commit -m "feat: add progression server domain"`

Expected: commit succeeds.

---

### Task 5: Add API Routes

**Files:**

- Create: `app/api/progression/route.ts`
- Create: `app/api/progression/profile/route.ts`
- Create: `app/api/progression/goals/route.ts`
- Create: `app/api/progression/check-ins/route.ts`
- Create: `app/api/progression/deadlines/route.ts`
- Create: `app/api/progression/xp-history/route.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.ts`
- Modify: `app/api/core-routes.test.ts`

- [ ] **Step 1: Write handler tests**

Cover auth failure, invalid payload/query, service failures, and success responses for each
route.

Run: `npm run test -- app/_features/progression/server/progression-route.handlers.test.ts`

Expected: FAIL before implementation.

- [ ] **Step 2: Implement route handlers**

Use existing `jsonOk()`, `jsonError()`, `getZodErrorMessage()`, and `AuthContext`.
Keep API files thin and delegate to handlers.

- [ ] **Step 3: Write route wiring tests**

Extend `app/api/core-routes.test.ts` to ensure the new route files call auth and handlers.

Run: `npm run test -- app/api/core-routes.test.ts`

Expected: FAIL before route files are wired.

- [ ] **Step 4: Implement API route files**

Routes:

- `GET /api/progression`: overview
- `POST /api/progression/profile`: ensure profile from browser timezone
- `GET /api/progression/goals`: optional filtered goals
- `POST /api/progression/goals`: create goal
- `PATCH /api/progression/goals`: edit/lifecycle/duplicate actions by `operation`
- `DELETE /api/progression/goals`: soft delete
- `POST /api/progression/check-ins`: create today's check-in
- `DELETE /api/progression/check-ins`: undo today's check-in
- `GET /api/progression/deadlines`: deadline warning/review status
- `PATCH /api/progression/deadlines`: complete/fail/postpone expired goal
- `GET /api/progression/xp-history`: paginated history

- [ ] **Step 5: Run tests**

Run: `npm run test -- app/_features/progression/server/progression-route.handlers.test.ts`

Run: `npm run test -- app/api/core-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add app/api/progression app/_features/progression/server app/api/core-routes.test.ts`

Run: `git commit -m "feat: expose progression API routes"`

Expected: commit succeeds.

---

### Task 6: Add Client API And Progression Store

**Files:**

- Create: `app/_features/progression/lib/progression-client.ts`
- Create: `app/_features/progression/state/progression.store.ts`
- Create: `app/_features/progression/state/progression.store.test.ts`
- Modify: `app/_features/progression/index.ts`

- [ ] **Step 1: Write client tests**

Mock `fetch`. Cover success and error normalization for overview, profile ensure, goal
mutations, check-ins, deadlines, and history.

Run: `npm run test -- app/_features/progression/lib/progression-client.test.ts`

Expected: FAIL before implementation.

- [ ] **Step 2: Implement client helpers**

Export functions:

- `getProgressionOverview()`
- `ensureProgressionProfile(timezone)`
- `createProgressionGoal(input)`
- `updateProgressionGoal(input)`
- `runProgressionGoalOperation(input)`
- `deleteProgressionGoal(id)`
- `createProgressionCheckin(actionId)`
- `undoProgressionCheckin(checkinId)`
- `resolveProgressionDeadline(input)`
- `getProgressionXpHistory(options)`

- [ ] **Step 3: Write store tests**

Cover loading state, refresh, optimistic check-in toggle with rollback, goal mutations, history
sidebar loading, and deadline review refresh.

Run: `npm run test -- app/_features/progression/state/progression.store.test.ts`

Expected: FAIL before implementation.

- [ ] **Step 4: Implement Zustand store**

Store state:

- `overview`
- `status`
- `error`
- `initialized`
- `history`
- `historyStatus`
- `deadlineWarning`

Store actions:

- `initialize`
- `refresh`
- `ensureProfile`
- `createGoal`
- `updateGoal`
- `runGoalOperation`
- `deleteGoal`
- `checkIn`
- `undoCheckIn`
- `resolveDeadline`
- `loadHistory`

- [ ] **Step 5: Run tests**

Run: `npm run test -- app/_features/progression/lib app/_features/progression/state`

Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add app/_features/progression`

Run: `git commit -m "feat: add progression client state"`

Expected: commit succeeds.

---

### Task 7: Add App-Shell Profile Bootstrap And Deadline Warning

**Files:**

- Create: `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- Create: `app/design/templates/app-shell/useAppShellProgression.ts`
- Create: `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`
- Modify: `app/design/templates/app-shell/AppShellTemplate.tsx`
- Modify: `app/design/organisms/navigation/AppSidebar.tsx`
- Modify: `app/_features/navigation/app-shell-navigation.ts`
- Modify: `app/design/app-shell-ui.test.tsx`

- [ ] **Step 1: Write provider tests**

Cover:

- Browser timezone is sent once when app shell mounts.
- Deadline status refreshes on mount.
- Exposes `hasProgressionDeadlineWarning`.
- Fails softly without blocking shell rendering.

Run: `npm run test -- app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`

Expected: FAIL before implementation.

- [ ] **Step 2: Implement app-shell progression provider**

Provider should:

- Read `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Call `ensureProgressionProfile(timezone)`.
- Call deadline status API.
- Provide warning state to navigation.

- [ ] **Step 3: Write sidebar/nav tests**

Cover:

- Progression nav item is enabled.
- Warning badge appears only for progression when deadline warning is true.
- Mobile sidebar inherits the same warning.

Run: `npm run test -- app/design/app-shell-ui.test.tsx`

Expected: FAIL before implementation.

- [ ] **Step 4: Update shell/navigation**

Set progression `enabled: true`. Wrap app shell with `AppShellProgressionProvider`.
Render a small yellow warning indicator for the progression nav item.

- [ ] **Step 5: Run tests**

Run: `npm run test -- app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`

Run: `npm run test -- app/design/app-shell-ui.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add app/design app/_features/navigation`

Run: `git commit -m "feat: add progression app shell status"`

Expected: commit succeeds.

---

### Task 8: Build Progression Page UI

**Files:**

- Modify: `app/(app-shell)/progression/page.tsx`
- Create: `app/design/templates/progression/ProgressionTemplate.tsx`
- Create: `app/design/templates/progression/useProgressionWorkspace.ts`
- Create: `app/design/organisms/progression/*`
- Create: `app/design/molecules/progression/ProgressionLevelPanel.tsx`
- Create: `app/design/progression-ui.test.tsx`

- [ ] **Step 1: Write UI tests**

Cover:

- Loading, empty, and error states.
- Level panel shows total XP, level, next-level progress, and XP remaining.
- Today view splits due today and available this week.
- Check-in and undo call store actions.
- Goal filters default to In progress.
- Goal actions menu exposes only allowed lifecycle actions.
- Deadline review dialog blocks `/progression` content until resolved.
- XP history sidebar opens on demand.

Run: `npm run test -- app/design/progression-ui.test.tsx`

Expected: FAIL before implementation.

- [ ] **Step 2: Implement template and workspace hook**

`ProgressionTemplate` should own layout and wire store state/actions. Keep business rules in
the feature store/service, not in JSX.

- [ ] **Step 3: Implement level and today panels**

Use compact work-focused panels consistent with dashboard styling. Avoid marketing copy and
keep controls direct.

- [ ] **Step 4: Implement goal list and form dialog**

Support create, edit, duplicate prefill, start now, deadline, completion XP, computed penalty,
and recurring actions.

- [ ] **Step 5: Implement deadline review dialog**

When expired unresolved goals exist, show one at a time with:

- Mark as completed.
- Confirm failure.
- Postpone when `deadlineChangeCount = 0`.

- [ ] **Step 6: Implement XP history sidebar**

Open from an icon/button and read from `progression_xp_history` API only.

- [ ] **Step 7: Run UI tests**

Run: `npm run test -- app/design/progression-ui.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

Run: `git add 'app/(app-shell)/progression/page.tsx' app/design`

Run: `git commit -m "feat: build progression page"`

Expected: commit succeeds.

---

### Task 9: Update Docs

**Files:**

- Modify: `README.md`
- Modify: `docs/progression-system-spec.md` only if assumptions need to become durable spec

- [ ] **Step 1: Update README**

Mention progression in:

- Main features.
- Tech/database list.
- Usage.
- Project structure.
- Architecture workflow.

- [ ] **Step 2: Update spec only for accepted clarifications**

If implementation uses the assumptions above, add a short "Implementation Clarifications"
section to `docs/progression-system-spec.md`.

- [ ] **Step 3: Commit**

Run: `git add README.md docs/progression-system-spec.md`

Run: `git commit -m "docs: document progression system"`

Expected: commit succeeds.

---

### Task 10: Full Verification

**Files:** all changed files

- [ ] **Step 1: Run focused progression tests**

Run: `npm run test -- app/_features/progression app/design/progression-ui.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run route and shell tests**

Run: `npm run test -- app/api/core-routes.test.ts app/design/app-shell-ui.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run full unit test suite**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Manual browser check**

Run: `npm run dev`

Open `/progression` and verify:

- Profile is created.
- Goal create/edit/duplicate/delete works.
- Check-in/undo changes XP once.
- Weekly-count target blocks extra check-ins.
- Deadline warning appears in navigation.
- Deadline dialog blocks only the progression page.
- XP history shows immutable descriptions.

- [ ] **Step 8: Commit any fixes**

Run: `git status --short`

Run: `git add <changed-files>`

Run: `git commit -m "fix: stabilize progression system"`

Expected: only if verification required fixes.

---

### Task 11: Push And Open Pull Request

**Files:** none

- [ ] **Step 1: Push branch**

Run: `git push -u origin codex/progression-system`

Expected: branch is pushed.

- [ ] **Step 2: Open a draft PR**

Use GitHub MCP tools first. Default repository: `CodingMyke/jarvis_ts`.

PR title:

```text
Build progression system
```

PR body:

```markdown
## Summary
- Add Supabase-backed progression profiles, goals, actions, check-ins, XP history, and XP RPCs
- Build progression API, client state, app-shell deadline warning, and /progression UI
- Document progression setup and behavior

## Verification
- npm run test
- npm run lint
- npm run typecheck
- npm run build
```

Expected: draft PR opens successfully. Do not merge.
