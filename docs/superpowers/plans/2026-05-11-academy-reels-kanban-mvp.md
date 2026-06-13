# Academy Reels Kanban MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Academy Reel workspace with nested sidebar navigation, dedicated routes, and a Kanban CRUD flow optimized for fast editorial operations.

**Architecture:** Keep navigation concerns in `app/_features/navigation` and `app/design/organisms/navigation`, while implementing Reel domain logic in a new bounded module `app/_features/academy/reels`. UI should be route-driven (`/academy/reels`) with server-first page composition and client-only interactions for drag/drop, drawer edit, and destructive confirmations.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5 strict mode, Zod, Supabase, Vitest + Testing Library, Tailwind CSS.

---

## Scope Check

This plan is only for **Reels** MVP.

In scope:
- Sidebar `Accademia` expandable with `Reel` and `Corsi`
- New route `/academy/reels`
- Placeholder route `/academy/courses`
- Reel Kanban columns (`idea`, `script`, `to_record`, `to_edit`, `ready`, `published`)
- Create (idea only), edit in right drawer, drag/drop status change, hard delete with confirm
- Published column shows only latest 3 + "Vedi tutti" link to future dedicated page
- Per-column ordering by `updatedAt desc`
- Owner-only data view (current logged-in user)

Out of scope:
- Course workflow and course board behavior
- AI generation integration (`generationStatus`, retry, processing)
- Published full-list page implementation (link target can be placeholder)
- Collaboration/shared workspace permissions

## File Structure Map

**Create**
- `app/(app-shell)/academy/reels/page.tsx`
- `app/(app-shell)/academy/courses/page.tsx`
- `app/(app-shell)/academy/reels/published/page.tsx`
- `app/_features/academy/reels/index.ts`
- `app/_features/academy/reels/lib/reel-board.types.ts`
- `app/_features/academy/reels/lib/reel-board.schemas.ts`
- `app/_features/academy/reels/lib/reel-board.constants.ts`
- `app/_features/academy/reels/server/reel-board.repository.ts`
- `app/_features/academy/reels/server/reel-board.service.ts`
- `app/_features/academy/reels/server/reel-board-route.schemas.ts`
- `app/_features/academy/reels/server/reel-board-route.handlers.ts`
- `app/_features/academy/reels/server/reel-board.service.test.ts`
- `app/_features/academy/reels/server/reel-board-route.handlers.test.ts`
- `app/_features/academy/reels/lib/reel-board-client.ts`
- `app/_features/academy/reels/lib/reel-board-client.test.ts`
- `app/api/academy/reels/route.ts`
- `app/api/academy/reels/[reelId]/route.ts`
- `app/api/academy/reels/[reelId]/status/route.ts`
- `app/design/templates/academy/ReelBoardTemplate.tsx`
- `app/design/templates/academy/useReelBoardWorkspace.ts`
- `app/design/templates/academy/useReelBoardWorkspace.test.tsx`
- `app/design/organisms/academy/ReelKanbanBoard.tsx`
- `app/design/organisms/academy/ReelKanbanColumn.tsx`
- `app/design/organisms/academy/ReelCard.tsx`
- `app/design/organisms/academy/ReelQuickCreate.tsx`
- `app/design/organisms/academy/ReelEditDrawer.tsx`
- `app/design/organisms/academy/ReelDeleteDialog.tsx`
- `app/design/academy-ui.test.tsx`

**Modify**
- `app/_features/navigation/app-shell-navigation.ts`
- `app/design/organisms/navigation/AppSidebar.tsx`
- `app/design/organisms/navigation/AppTopbar.tsx`
- `app/design/app-shell-ui.test.tsx`
- `app/(app-shell)/academy/page.tsx`
- `README.md`

---

### Task 1: Add Nested Academy Navigation Model

**Files:**
- Modify: `app/_features/navigation/app-shell-navigation.ts`
- Modify: `app/design/organisms/navigation/AppSidebar.tsx`
- Modify: `app/design/organisms/navigation/AppTopbar.tsx`
- Modify: `app/design/app-shell-ui.test.tsx`

- [x] **Step 1: Write failing navigation tests**

Add tests that lock these rules:
- `Accademia` is expandable in sidebar desktop and mobile
- Subitems are visible: `Reel`, `Corsi`
- Active state works for `/academy/reels` and `/academy/courses`
- Topbar title is `Accademia` for Academy subroutes

- [x] **Step 2: Run tests to confirm failure**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx
```
Expected: FAIL because nested model is not implemented.

- [x] **Step 3: Implement navigation shape and rendering**

Implement `children` support in navigation config and sidebar rendering without breaking existing items.

Suggested types:
```ts
export interface AppShellNavigationChildItem {
  key: "academy_reels" | "academy_courses";
  href: "/academy/reels" | "/academy/courses";
  label: string;
  title: string;
  enabled: boolean;
}
```

Keep parent `academy` clickable behavior explicit (recommended: parent toggles submenu and subitems handle navigation).

- [x] **Step 4: Re-run navigation tests**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit navigation foundation**

```bash
git add app/_features/navigation/app-shell-navigation.ts app/design/organisms/navigation/AppSidebar.tsx app/design/organisms/navigation/AppTopbar.tsx app/design/app-shell-ui.test.tsx
git commit -m "feat: add nested academy sidebar navigation"
```

---

### Task 2: Add Academy Subroutes and Replace Placeholder Entry

**Files:**
- Create: `app/(app-shell)/academy/reels/page.tsx`
- Create: `app/(app-shell)/academy/courses/page.tsx`
- Create: `app/(app-shell)/academy/reels/published/page.tsx`
- Modify: `app/(app-shell)/academy/page.tsx`

- [x] **Step 1: Write failing route-level UI tests**

Add tests in `app/design/academy-ui.test.tsx` for:
- `/academy/reels` renders reel board shell
- `/academy/courses` renders explicit placeholder
- `/academy/reels/published` renders explicit placeholder

- [x] **Step 2: Run the new tests to verify they fail**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx
```
Expected: FAIL because routes/components do not exist.

- [x] **Step 3: Implement route pages**

- `academy/page.tsx` becomes a redirect or lightweight chooser (recommended redirect to `/academy/reels`)
- `academy/courses/page.tsx` remains intentional placeholder
- `academy/reels/published/page.tsx` remains intentional placeholder for future phase

- [x] **Step 4: Re-run route tests**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit route scaffolding**

```bash
git add app/(app-shell)/academy/page.tsx app/(app-shell)/academy/reels/page.tsx app/(app-shell)/academy/courses/page.tsx app/(app-shell)/academy/reels/published/page.tsx app/design/academy-ui.test.tsx
git commit -m "feat: scaffold academy reels and courses routes"
```

---

### Task 3: Define Reel Domain Contracts and Validation

**Files:**
- Create: `app/_features/academy/reels/lib/reel-board.types.ts`
- Create: `app/_features/academy/reels/lib/reel-board.schemas.ts`
- Create: `app/_features/academy/reels/lib/reel-board.constants.ts`
- Create: `app/_features/academy/reels/index.ts`
- Create: `app/_features/academy/reels/server/reel-board.service.test.ts`

- [x] **Step 1: Write failing domain tests**

Cover:
- allowed statuses exactly: `idea`, `script`, `to_record`, `to_edit`, `ready`, `published`
- create payload requires `idea` (trimmed, non-empty)
- edit payload supports `title`, `caption`, `body`, `hashtags`, `idea`, `notes`, `scheduledAt`, `publishedAt`
- owner scoping is required in service signatures

- [x] **Step 2: Run targeted tests to verify failure**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: FAIL because contracts are missing.

- [x] **Step 3: Implement schema/types/constants minimally**

Use Zod at boundaries and exported TypeScript types for app-wide consistency.

- [x] **Step 4: Re-run domain tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit domain contracts**

```bash
git add app/_features/academy/reels/index.ts app/_features/academy/reels/lib/reel-board.types.ts app/_features/academy/reels/lib/reel-board.schemas.ts app/_features/academy/reels/lib/reel-board.constants.ts app/_features/academy/reels/server/reel-board.service.test.ts
git commit -m "feat: define reel board domain contracts"
```

---

### Task 4: Implement Reel API and Server Service (Owner-Scoped CRUD)

**Files:**
- Create: `app/_features/academy/reels/server/reel-board.repository.ts`
- Create: `app/_features/academy/reels/server/reel-board.service.ts`
- Create: `app/_features/academy/reels/server/reel-board-route.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-board-route.handlers.ts`
- Create: `app/_features/academy/reels/server/reel-board-route.handlers.test.ts`
- Create: `app/api/academy/reels/route.ts`
- Create: `app/api/academy/reels/[reelId]/route.ts`
- Create: `app/api/academy/reels/[reelId]/status/route.ts`
- Create: `app/_features/academy/reels/lib/reel-board-client.ts`
- Create: `app/_features/academy/reels/lib/reel-board-client.test.ts`

- [x] **Step 1: Write failing API contract tests**

Cover:
- `GET /api/academy/reels` returns grouped/ordered data for board use
- `POST /api/academy/reels` accepts only `idea` on creation
- `PATCH /api/academy/reels/:reelId` updates editable fields
- `PATCH /api/academy/reels/:reelId/status` updates status for drag/drop
- `DELETE /api/academy/reels/:reelId` hard deletes after confirm path on UI
- all routes require authenticated owner context

- [x] **Step 2: Run API tests to verify failure**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board-route.handlers.test.ts app/_features/academy/reels/lib/reel-board-client.test.ts
```
Expected: FAIL because handlers/routes/client are missing.

- [x] **Step 3: Implement repository + service + handlers**

Use existing project patterns for:
- Supabase server client access
- structured errors via shared route helpers
- Zod validation at route boundary
- consistent owner filtering on every read/write/delete

- [x] **Step 4: Re-run API/client tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board-route.handlers.test.ts app/_features/academy/reels/lib/reel-board-client.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit backend slice**

```bash
git add app/_features/academy/reels/server/reel-board.repository.ts app/_features/academy/reels/server/reel-board.service.ts app/_features/academy/reels/server/reel-board-route.schemas.ts app/_features/academy/reels/server/reel-board-route.handlers.ts app/_features/academy/reels/server/reel-board-route.handlers.test.ts app/_features/academy/reels/lib/reel-board-client.ts app/_features/academy/reels/lib/reel-board-client.test.ts app/api/academy/reels/route.ts app/api/academy/reels/[reelId]/route.ts app/api/academy/reels/[reelId]/status/route.ts
git commit -m "feat: add owner-scoped reel board api"
```

---

### Task 5: Build Reel Kanban UI (Create, Drag/Drop, Drawer Edit, Delete)

**Files:**
- Create: `app/design/templates/academy/ReelBoardTemplate.tsx`
- Create: `app/design/templates/academy/useReelBoardWorkspace.ts`
- Create: `app/design/templates/academy/useReelBoardWorkspace.test.tsx`
- Create: `app/design/organisms/academy/ReelKanbanBoard.tsx`
- Create: `app/design/organisms/academy/ReelKanbanColumn.tsx`
- Create: `app/design/organisms/academy/ReelCard.tsx`
- Create: `app/design/organisms/academy/ReelQuickCreate.tsx`
- Create: `app/design/organisms/academy/ReelEditDrawer.tsx`
- Create: `app/design/organisms/academy/ReelDeleteDialog.tsx`
- Modify: `app/(app-shell)/academy/reels/page.tsx`
- Modify: `app/design/academy-ui.test.tsx`

- [x] **Step 1: Write failing UI behavior tests**

Cover user-level behavior:
- create card with `idea` only
- open edit drawer from card action
- save field edits and reflect update
- drag card across columns and persist status
- delete flow requires confirm dialog, then card disappears
- `published` column shows max 3 cards
- "Vedi tutti" link exists and points to `/academy/reels/published`

- [x] **Step 2: Run UI tests to verify failure**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx app/design/templates/academy/useReelBoardWorkspace.test.tsx
```
Expected: FAIL because components/workspace logic are missing.

- [x] **Step 3: Implement minimal UI + state orchestration**

Implementation notes:
- Keep per-column ordering by `updatedAt desc`
- Use optimistic updates for drag/drop and edits where safe
- Revert optimistic state on API failure with clear toast/error surface
- Keep `body` as one field (no split)

- [x] **Step 4: Re-run UI tests**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx app/design/templates/academy/useReelBoardWorkspace.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit UI slice**

```bash
git add app/(app-shell)/academy/reels/page.tsx app/design/templates/academy/ReelBoardTemplate.tsx app/design/templates/academy/useReelBoardWorkspace.ts app/design/templates/academy/useReelBoardWorkspace.test.tsx app/design/organisms/academy/ReelKanbanBoard.tsx app/design/organisms/academy/ReelKanbanColumn.tsx app/design/organisms/academy/ReelCard.tsx app/design/organisms/academy/ReelQuickCreate.tsx app/design/organisms/academy/ReelEditDrawer.tsx app/design/organisms/academy/ReelDeleteDialog.tsx app/design/academy-ui.test.tsx
git commit -m "feat: implement reels kanban board interactions"
```

---

### Task 6: Documentation and Final Verification

**Files:**
- Modify: `README.md`
- (Optional, if v1 architecture doc needs UX addendum): `docs/academy-reel-agent-v1-architecture.md`

- [x] **Step 1: Write failing documentation check (manual checklist)**

Checklist:
- README includes new Academy IA (`/academy/reels`, `/academy/courses`)
- README describes current Reel MVP capabilities and explicit non-goals
- Documentation stays consistent with AGENTS scope rules

- [x] **Step 2: Update docs minimally**

Add only what changed:
- navigation behavior
- Reel board workflow
- placeholder routes for future work

- [x] **Step 3: Run full verification suite**

Run:
```bash
npm run lint
npm run typecheck
npm run test
```
Expected: PASS.

- [ ] **Step 4: Manual browser QA**

Verify in browser:
- desktop + mobile sidebar expansion
- drag/drop behavior
- drawer edit UX
- delete confirmation UX
- published 3-item cap + link

- [ ] **Step 5: Commit docs and stabilization**

```bash
git add README.md docs/academy-reel-agent-v1-architecture.md
git commit -m "docs: describe academy reels kanban mvp"
```

---

## Skills To Apply During Execution

- `@superpowers:test-driven-development` before each implementation task.
- `@superpowers:verification-before-completion` before claiming success.
- `@superpowers:requesting-code-review` after Task 6 and before PR finalization.

## PR Checklist

- [x] Branch created for this issue-focused work (no worktree)
- [x] All task checkboxes updated accurately
- [x] Lint, typecheck, and tests passing
- [ ] Scope respected (no course workflow logic beyond placeholder)
- [ ] PR opened against `main` with concise test evidence

Plan complete and saved to `docs/superpowers/plans/2026-05-11-academy-reels-kanban-mvp.md`. Ready to execute?
