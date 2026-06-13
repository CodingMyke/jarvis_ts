# Progression Component Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are explicitly requested by the user) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `/progression` page into autonomous server-loaded sections with their own data loads and dedicated APIs, while keeping interactive controls in client islands.

**Architecture:** Replace the monolithic progression workspace load with section-level loaders for level, goals, today/week actions, deadline review, and on-demand history. The page becomes a server-composed tree with `Suspense` boundaries and skeleton fallbacks, and each interactive organism stays client-side only for actions like check-ins, goal menus, dialog edits, and history opening. The sidebar/status work is intentionally out of scope here because it is being handled in a separate plan.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Zod, Supabase, Zustand, Vitest, Testing Library, Tailwind CSS.

---

## Scope Check

This plan covers the main progression page only:

- level panel
- goals list and goal form
- today/week action lists
- deadline review flow
- XP history sidebar/content

Out of scope:

- progression sidebar status badge
- any shell-wide status refactor
- schema changes
- unrelated navigation or assistant work

The result should remove the single page-level overview dependency without changing the visible behavior of the progression page.

## File Structure Map

**Create**
- `app/api/progression/level/route.ts`
- `app/api/progression/today/route.ts`
- `app/design/templates/progression/ProgressionPage.tsx`
- `app/design/templates/progression/ProgressionPageSkeleton.tsx`
- `app/design/organisms/progression/ProgressionLevelSection.tsx`
- `app/design/organisms/progression/ProgressionGoalsSection.tsx`
- `app/design/organisms/progression/ProgressionTodaySection.tsx`
- `app/design/organisms/progression/ProgressionDeadlineSection.tsx`
- `app/design/organisms/progression/ProgressionHistorySection.tsx`
- `app/design/organisms/progression/ProgressionLevelSkeleton.tsx`
- `app/design/organisms/progression/ProgressionGoalsSkeleton.tsx`
- `app/design/organisms/progression/ProgressionTodaySkeleton.tsx`
- `app/design/organisms/progression/ProgressionDeadlineSkeleton.tsx`

**Modify**
- `app/(app-shell)/progression/page.tsx`
- `app/_features/progression/index.ts`
- `app/_features/progression/lib/progression-client.ts`
- `app/_features/progression/server/progression-route.schemas.ts`
- `app/_features/progression/server/progression-route.handlers.ts`
- `app/_features/progression/server/progression.service.ts`
- `app/_features/progression/server/progression-route.handlers.test.ts`
- `app/_features/progression/lib/progression-client.test.ts`
- `app/api/progression/goals/route.ts`
- `app/api/progression/deadlines/route.ts`
- `app/api/progression/xp-history/route.ts`
- `app/design/templates/progression/ProgressionTemplate.tsx`
- `app/design/templates/progression/useProgressionWorkspace.ts`
- `app/design/templates/progression/useProgressionWorkspace.test.tsx`
- `app/design/organisms/progression/ProgressionGoalList.tsx`
- `app/design/organisms/progression/ProgressionGoalFormDialog.tsx`
- `app/design/organisms/progression/ProgressionTodayPanel.tsx`
- `app/design/organisms/progression/ProgressionXpHistorySidebar.tsx`
- `app/design/progression-ui.test.tsx`
- `app/api/core-routes.test.ts`
- `README.md`

---

### Task 1: Extract Section-Level Progression Data Contracts

**Files:**
- Modify: `app/_features/progression/server/progression.service.ts`
- Modify: `app/_features/progression/server/progression-route.schemas.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.ts`
- Modify: `app/_features/progression/index.ts`
- Create: `app/api/progression/level/route.ts`
- Create: `app/api/progression/today/route.ts`
- Modify: `app/api/progression/goals/route.ts`
- Modify: `app/api/progression/deadlines/route.ts`
- Modify: `app/api/progression/xp-history/route.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.test.ts`
- Modify: `app/_features/progression/lib/progression-client.test.ts`
- Modify: `app/api/core-routes.test.ts`

- [x] **Step 1: Write the failing contract tests**

Add tests for the new section-shaped responses:

- level payload returns only level/XP state
- today payload returns only visible today/week items plus the local date needed for scheduling
- goals list payload returns the list of goals without goal detail actions
- goal detail payload still works on demand for `edit` and `duplicate`
- deadline review payload still returns the expired-goal review state

The key behavior to lock in is that the page no longer needs a single overview response.

- [x] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/api/core-routes.test.ts
```

Expected: fail because the section endpoints and client helpers do not exist yet.

- [x] **Step 3: Split the progression service into reusable loaders**

Refactor `progression.service.ts` so the page can load each section independently without duplicating the full overview query.

Implement the minimal shared helpers needed for:

- profile loading
- level calculation
- visible goals list loading
- visible today/week action loading
- expired-goal deadline review loading
- history loading

Keep the existing overview function available only as legacy compatibility until the new page no longer uses it.

- [x] **Step 4: Add the section routes and handlers**

Implement these contracts:

- `GET /api/progression/level`
- `GET /api/progression/today`
- `GET /api/progression/goals` for the list payload
- `GET /api/progression/goals?id=<goalId>` for goal details
- `GET /api/progression/deadlines`
- `GET /api/progression/xp-history`

Keep the route handlers thin and validate request inputs with the existing Zod boundary patterns.

- [x] **Step 5: Run the contract tests again**

Run:

```bash
npm run test -- app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/api/core-routes.test.ts
```

Expected: pass.

- [x] **Step 6: Commit the data contract split**

Run:

```bash
git add app/_features/progression/server/progression.service.ts app/_features/progression/server/progression-route.schemas.ts app/_features/progression/server/progression-route.handlers.ts app/_features/progression/index.ts app/api/progression/level/route.ts app/api/progression/today/route.ts app/api/progression/goals/route.ts app/api/progression/deadlines/route.ts app/api/progression/xp-history/route.ts app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/api/core-routes.test.ts
git commit -m "feat: split progression data contracts"
```

---

### Task 2: Replace the Monolithic Workspace With Server-Composed Sections

**Files:**
- Modify: `app/(app-shell)/progression/page.tsx`
- Create: `app/design/templates/progression/ProgressionPage.tsx`
- Create: `app/design/templates/progression/ProgressionPageSkeleton.tsx`
- Create: `app/design/organisms/progression/ProgressionLevelSection.tsx`
- Create: `app/design/organisms/progression/ProgressionGoalsSection.tsx`
- Create: `app/design/organisms/progression/ProgressionTodaySection.tsx`
- Create: `app/design/organisms/progression/ProgressionDeadlineSection.tsx`
- Create: `app/design/organisms/progression/ProgressionHistorySection.tsx`
- Create: `app/design/organisms/progression/ProgressionLevelSkeleton.tsx`
- Create: `app/design/organisms/progression/ProgressionGoalsSkeleton.tsx`
- Create: `app/design/organisms/progression/ProgressionTodaySkeleton.tsx`
- Create: `app/design/organisms/progression/ProgressionDeadlineSkeleton.tsx`
- Modify: `app/design/templates/progression/ProgressionTemplate.tsx`
- Modify: `app/design/progression-ui.test.tsx`
- Modify: `app/design/templates/progression/useProgressionWorkspace.ts`
- Modify: `app/design/templates/progression/useProgressionWorkspace.test.tsx`

- [x] **Step 1: Write the failing page composition tests**

Add tests that prove the page renders as separate sections with independent loading states:

- the level area has its own fallback
- the goals area has its own fallback
- the today/week area has its own fallback
- the deadline review area can block the page independently
- the page no longer depends on one all-or-nothing workspace status

- [x] **Step 2: Run the page UI tests to verify they fail**

Run:

```bash
npm run test -- app/design/progression-ui.test.tsx app/design/templates/progression/useProgressionWorkspace.test.tsx
```

Expected: fail because the current page still uses the monolithic workspace hook.

- [x] **Step 3: Build the server-composed progression page**

Implement a server page that composes the sections with `Suspense`:

- `ProgressionPage` becomes the server orchestration layer
- `ProgressionLevelSection` fetches and renders only level data
- `ProgressionGoalsSection` fetches and renders only goals data
- `ProgressionTodaySection` fetches and renders only today/week items
- `ProgressionDeadlineSection` fetches and renders the deadline review block
- `ProgressionHistorySection` owns the history UI entry point

Keep the presentational atoms and molecules intact. The goal is to move data ownership, not to redesign the UI.

- [x] **Step 4: Remove or reduce the monolithic workspace hook**

Once the page sections own their data, delete the `useProgressionWorkspace` coupling or shrink it to only the tiny bits that are still truly shared.

The rule is simple:

- no page-wide `refresh()` orchestration
- no page-wide `overview` store
- no client-side derivation of data that the server already knows

- [x] **Step 5: Re-run the page tests**

Run:

```bash
npm run test -- app/design/progression-ui.test.tsx app/design/templates/progression/useProgressionWorkspace.test.tsx
```

Expected: pass.

- [x] **Step 6: Commit the page split**

Run:

```bash
git add app/(app-shell)/progression/page.tsx app/design/templates/progression/ProgressionPage.tsx app/design/templates/progression/ProgressionPageSkeleton.tsx app/design/organisms/progression/ProgressionLevelSection.tsx app/design/organisms/progression/ProgressionGoalsSection.tsx app/design/organisms/progression/ProgressionTodaySection.tsx app/design/organisms/progression/ProgressionDeadlineSection.tsx app/design/organisms/progression/ProgressionHistorySection.tsx app/design/organisms/progression/ProgressionLevelSkeleton.tsx app/design/organisms/progression/ProgressionGoalsSkeleton.tsx app/design/organisms/progression/ProgressionTodaySkeleton.tsx app/design/organisms/progression/ProgressionDeadlineSkeleton.tsx app/design/templates/progression/ProgressionTemplate.tsx app/design/progression-ui.test.tsx app/design/templates/progression/useProgressionWorkspace.ts app/design/templates/progression/useProgressionWorkspace.test.tsx
git commit -m "feat: split progression page into sections"
```

---

### Task 3: Rebuild the Interactive Client Islands

**Files:**
- Modify: `app/_features/progression/lib/progression-client.ts`
- Modify: `app/design/organisms/progression/ProgressionGoalList.tsx`
- Modify: `app/design/organisms/progression/ProgressionGoalFormDialog.tsx`
- Modify: `app/design/organisms/progression/ProgressionTodayPanel.tsx`
- Modify: `app/design/organisms/progression/ProgressionXpHistorySidebar.tsx`
- Modify: `app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx`
- Modify: `app/design/templates/app-shell/AppShellProgressionProvider.tsx` only if the history opener bridge needs to be re-registered

- [x] **Step 1: Write the failing interaction tests**

Add tests that prove the client islands still behave like real UI:

- check-ins and undo still hit the mutation APIs
- goal actions still open edit/duplicate/delete/start/complete/fail flows
- goal detail data is fetched only when a dialog opens
- history still opens on demand
- deadline review still submits resolution actions

- [x] **Step 2: Run the interaction tests to verify they fail**

Run:

```bash
npm run test -- app/design/progression-ui.test.tsx app/_features/progression/lib/progression-client.test.ts
```

Expected: fail if any client island still assumes the old workspace hook shape.

- [x] **Step 3: Reconnect each island to its own API contract**

Keep each interactive organism focused:

- `ProgressionTodayPanel` handles check-in and undo only
- `ProgressionGoalFormDialog` handles on-demand goal detail loading and submit
- `ProgressionGoalList` stays presentational and receives data/callbacks
- `ProgressionXpHistorySidebar` owns the on-demand history fetch
- `ProgressionDeadlineReviewDialog` owns deadline action submission

If a component only displays data, keep it server-fed and stateless.

- [x] **Step 4: Re-run the interaction tests**

Run:

```bash
npm run test -- app/design/progression-ui.test.tsx app/_features/progression/lib/progression-client.test.ts
```

Expected: pass.

- [x] **Step 5: Commit the interactive island work**

Run:

```bash
git add app/_features/progression/lib/progression-client.ts app/design/organisms/progression/ProgressionGoalList.tsx app/design/organisms/progression/ProgressionGoalFormDialog.tsx app/design/organisms/progression/ProgressionTodayPanel.tsx app/design/organisms/progression/ProgressionXpHistorySidebar.tsx app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx app/design/templates/app-shell/AppShellProgressionProvider.tsx
git commit -m "feat: preserve progression interactivity after split"
```

---

### Task 4: Update Documentation and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `app/design/progression-ui.test.tsx`
- Modify: `app/design/templates/progression/useProgressionWorkspace.test.tsx`
- Modify: any file that still references the removed monolithic progression workspace

- [x] **Step 1: Fix any remaining test imports or snapshots**

Update any stale test setup that still expects the old workspace shape or the old single-fetch behavior.

- [x] **Step 2: Update the architecture docs**

Add a short README note that the progression page now loads in sections with server-composed data and client-only interactive islands.

- [x] **Step 3: Run the full progression-focused verification**

Run:

```bash
npm run test -- app/design/progression-ui.test.tsx app/design/templates/progression/useProgressionWorkspace.test.tsx app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/api/core-routes.test.ts
npm run lint
npm run typecheck
```

Expected: all pass.

- [x] **Step 4: Commit the final cleanup**

Run:

```bash
git add README.md app/design/progression-ui.test.tsx app/design/templates/progression/useProgressionWorkspace.test.tsx
git commit -m "docs: update progression split architecture"
```
