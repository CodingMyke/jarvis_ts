# UI System Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the shared UI system around centralized semantic tokens, remove decorative wrappers and rounded borders, and migrate the product UI to a consistent `app/_shared/ui` architecture without changing product behavior.

**Architecture:** Keep page and route entrypoints thin, move shared UI primitives into `app/_shared/ui/{tokens,atoms,molecules,organisms}`, and leave `app/design` as a high-level composition layer for templates/page assemblies only. Use CSS variables as the source of truth for tokens, map them into Tailwind 4 theme usage, and refactor existing components to consume shared primitives and token-first class names rather than ad hoc visual values.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5 strict mode, Tailwind CSS 4, Vitest + Testing Library, ESLint.

---

## Scope Check

This plan is only for the **UI system refactor and global design normalization**.

In scope:
- Central semantic token system aligned with the current palette and spacing values where no new preference was given
- Global removal of rounded decorative borders; `radius-none` becomes the standard default
- New shared UI structure under `app/_shared/ui`
- Shared primitives with opinionated variants only
- Migration of major UI surfaces: auth, app shell/navigation, dashboard, calendar, tasks, timer, progression, academy/reels, settings, assistant shell
- Removal of decorative wrappers and nested visual shells that do not communicate real grouping
- Internal UI system documentation
- README architecture update if imports/structure move materially

Out of scope:
- Product behavior changes
- Domain/data refactors unrelated to UI composition
- Full visual redesign of palette or typography
- Removing legitimate functional grouping panels
- Forcing the voice orb and other highly special interaction surfaces into the same flat panel language

## Non-Negotiable Rules

- Shared reusable UI must live in `app/_shared/ui`
- `app/design` remains allowed only for page/template composition and feature-specific assemblies
- Tokens are semantic-first and CSS-first
- Tailwind utility usage is token-first and strict-by-default
- Raw utility values are allowed only when truly local and non-reusable
- Visual wrappers stay only when they group related content/state/tools in a way visible to the user
- Code-only wrappers are allowed when needed for behavior, accessibility, layout, or state boundaries
- Borders are used sparingly
- Rounded borders are removed by default; exceptions must be functional/identitary and explicit
- Follow `AGENTS.md` reuse rules and React best-practice guidance during implementation

## Initial Token Policy

Use current design values as the starting point unless the user already decided otherwise:
- Keep current palette relationships (`background`, `foreground`, `muted`, accent family, warning/danger colors) as the starting semantic values
- Keep current spacing rhythm as the initial basis, but expose it through semantic space tokens
- Normalize radius to `none` by default, with explicit exception tokens only for circular affordances like orb/status dots
- Preserve current motion timing/easing values unless they conflict with the simplified UI direction
- Keep current surfaces/glass values only where a real floating/tool surface still needs them after wrapper cleanup

## File Structure Map

**Create**
- `app/_shared/ui/index.ts`
- `app/_shared/ui/tokens/theme.css`
- `app/_shared/ui/tokens/utilities.css`
- `app/_shared/ui/tokens/README.md`
- `app/_shared/ui/atoms/Button.tsx`
- `app/_shared/ui/atoms/IconButton.tsx`
- `app/_shared/ui/atoms/Text.tsx`
- `app/_shared/ui/atoms/Heading.tsx`
- `app/_shared/ui/atoms/Surface.tsx`
- `app/_shared/ui/atoms/Divider.tsx`
- `app/_shared/ui/atoms/Field.tsx`
- `app/_shared/ui/atoms/TextArea.tsx`
- `app/_shared/ui/atoms/Badge.tsx`
- `app/_shared/ui/atoms/index.ts`
- `app/_shared/ui/molecules/SectionHeader.tsx`
- `app/_shared/ui/molecules/EmptyState.tsx`
- `app/_shared/ui/molecules/DialogFrame.tsx`
- `app/_shared/ui/molecules/FormField.tsx`
- `app/_shared/ui/molecules/index.ts`
- `app/_shared/ui/organisms/AppPanel.tsx`
- `app/_shared/ui/organisms/SidebarSection.tsx`
- `app/_shared/ui/organisms/index.ts`
- `docs/superpowers/specs/ui-system-guidelines.md`

**Modify**
- `app/globals.css`
- `app/layout.tsx`
- `app/design/index.ts`
- `app/design/atoms/shared/Button.tsx`
- `app/design/atoms/shared/index.ts`
- `app/design/molecules/auth/LoginCard.tsx`
- `app/design/molecules/auth/AuthButton.tsx`
- `app/design/molecules/auth/SettingsSectionHeader.tsx`
- `app/design/molecules/tasks/TodoListHeader.tsx`
- `app/design/molecules/tasks/TodoItem.tsx`
- `app/design/molecules/timer/TimerControls.tsx`
- `app/design/molecules/timer/TimerReadout.tsx`
- `app/design/molecules/calendar/EventDeleteActions.tsx`
- `app/design/molecules/calendar/EventItemDetails.tsx`
- `app/design/molecules/calendar/EventItemHeader.tsx`
- `app/design/molecules/assistant/FloatingChatHeader.tsx`
- `app/design/molecules/assistant/FloatingChatDeleteDialog.tsx`
- `app/design/molecules/assistant/ChatBubble.tsx`
- `app/design/molecules/assistant/AssistantStatusBlock.tsx`
- `app/design/organisms/navigation/AppSidebar.tsx`
- `app/design/organisms/navigation/AppMobileSidebar.tsx`
- `app/design/organisms/navigation/AppTopbar.tsx`
- `app/design/organisms/auth/LoginPanel.tsx`
- `app/design/organisms/auth/SettingsPanel.tsx`
- `app/design/organisms/calendar/CalendarPanel.tsx`
- `app/design/organisms/calendar/CalendarDayGroup.tsx`
- `app/design/organisms/calendar/CalendarEventCard.tsx`
- `app/design/organisms/tasks/TodoPanel.tsx`
- `app/design/organisms/tasks/DashboardTodoPanel.tsx`
- `app/design/organisms/timer/TimerPanel.tsx`
- `app/design/organisms/assistant/FloatingChat.tsx`
- `app/design/organisms/assistant/AssistantActionsLink.tsx`
- `app/design/organisms/assistant/AssistantStatusPanel.tsx`
- `app/design/organisms/progression/ProgressionGoalFormDialog.tsx`
- `app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx`
- `app/design/organisms/progression/ProgressionGoalList.tsx`
- `app/design/organisms/progression/ProgressionTodayPanel.tsx`
- `app/design/organisms/progression/ProgressionXpHistorySidebar.tsx`
- `app/design/organisms/progression/ProgressionLevelSection.tsx`
- `app/design/organisms/progression/ProgressionGoalsSection.tsx`
- `app/design/organisms/progression/ProgressionTodaySection.tsx`
- `app/design/organisms/progression/ProgressionDeadlineSection.tsx`
- `app/design/organisms/academy/ReelKanbanBoard.tsx`
- `app/design/organisms/academy/ReelKanbanColumn.tsx`
- `app/design/organisms/academy/ReelCard.tsx`
- `app/design/organisms/academy/ReelQuickCreate.tsx`
- `app/design/organisms/academy/ReelEditDrawer.tsx`
- `app/design/organisms/academy/ReelDeleteDialog.tsx`
- `app/design/templates/auth/LoginTemplate.tsx`
- `app/design/templates/dashboard/DashboardCalendarTemplate.tsx`
- `app/design/templates/dashboard/DashboardTodoTemplate.tsx`
- `app/design/templates/assistant/AssistantWorkspaceTemplate.tsx`
- `app/design/templates/settings/SettingsTemplate.tsx`
- `app/design/templates/progression/ProgressionTemplate.tsx`
- `app/design/templates/progression/ProgressionPage.tsx`
- `app/design/templates/academy/ReelBoardTemplate.tsx`
- `app/design/app-shell-ui.test.tsx`
- `app/design/auth-ui.test.tsx`
- `app/design/dashboard-ui.test.tsx`
- `app/design/assistant-ui.test.tsx`
- `app/design/calendar-ui.test.tsx`
- `app/design/tasks-timer-ui.test.tsx`
- `app/design/progression-ui.test.tsx`
- `app/design/academy-ui.test.tsx`
- `README.md`

## Task 1: Inventory UI Tokens and Wrapper Rules

**Files:**
- Modify: `docs/superpowers/specs/ui-system-guidelines.md`
- Modify: `app/globals.css`
- Test: `app/design/app-shell-ui.test.tsx`

- [x] **Step 1: Document the target token taxonomy and wrapper rules**

Write the guideline document with:
- semantic token groups (`color`, `surface`, `border`, `space`, `text`, `shadow`, `motion`, `z-index`)
- wrapper decision rules
- allowed exceptions for circular affordances
- token-first vs raw utility escape hatch rule
- required import boundaries for `app/_shared/ui`

- [x] **Step 2: Review current CSS variables and recurring UI values**

Inspect `app/globals.css` and the most repeated `app/design` class patterns.
Lock the initial token values to current design defaults except where the user already mandated changes.

- [x] **Step 3: Add failing assertions for global shape rules**

Add or update UI tests to assert:
- buttons/panels no longer depend on rounded utility classes by default
- app shell grouping still renders correctly after wrapper cleanup

- [x] **Step 4: Run the targeted test file to confirm failure**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx
```
Expected: FAIL because the new tokenized shape rules are not implemented yet.

- [ ] **Step 5: Commit the planning inventory**

```bash
git add docs/superpowers/specs/ui-system-guidelines.md app/globals.css app/design/app-shell-ui.test.tsx
git commit -m "docs: define ui system token and wrapper rules"
```

---

## Task 2: Create the Token Source of Truth

**Files:**
- Create: `app/_shared/ui/tokens/theme.css`
- Create: `app/_shared/ui/tokens/utilities.css`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [x] **Step 1: Write failing token smoke assertions**

Add a small render test or DOM assertion in an existing UI test file that expects:
- semantic token-backed utility classes to exist
- body/app shell surfaces to consume shared variables

- [x] **Step 2: Run the targeted test to confirm failure**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx
```
Expected: FAIL because the token files and imports do not exist.

- [x] **Step 3: Implement central token files**

Define token families such as:
- `--color-bg-app`, `--color-surface-panel`, `--color-surface-overlay`, `--color-text-primary`, `--color-text-muted`
- `--border-subtle`, `--border-strong`, `--border-accent`, `--radius-none`, `--radius-circle`
- `--space-compact`, `--space-inline`, `--space-section`, `--space-panel`, `--space-stack-sm`, `--space-stack-md`
- `--text-body`, `--text-caption`, `--text-title`, `--text-section`
- `--shadow-overlay`, `--shadow-focus`, `--motion-fast`, `--motion-base`

Use current values as the default baseline, except:
- default radius becomes none
- border usage is reduced and standardized

- [x] **Step 4: Wire tokens into `app/globals.css`**

- import token files
- map theme variables
- remove or downgrade obsolete decorative utilities
- keep orb-specific variables as explicit exceptions

- [x] **Step 5: Re-run the targeted test**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit token foundation**

```bash
git add app/_shared/ui/tokens/theme.css app/_shared/ui/tokens/utilities.css app/globals.css app/layout.tsx app/design/auth-ui.test.tsx
git commit -m "feat: add shared semantic ui tokens"
```

---

## Task 3: Build Shared Atoms with Opinionated APIs

**Files:**
- Create: `app/_shared/ui/atoms/Button.tsx`
- Create: `app/_shared/ui/atoms/IconButton.tsx`
- Create: `app/_shared/ui/atoms/Text.tsx`
- Create: `app/_shared/ui/atoms/Heading.tsx`
- Create: `app/_shared/ui/atoms/Surface.tsx`
- Create: `app/_shared/ui/atoms/Divider.tsx`
- Create: `app/_shared/ui/atoms/Field.tsx`
- Create: `app/_shared/ui/atoms/TextArea.tsx`
- Create: `app/_shared/ui/atoms/Badge.tsx`
- Create: `app/_shared/ui/atoms/index.ts`
- Create: `app/_shared/ui/index.ts`
- Modify: `app/design/atoms/shared/Button.tsx`
- Modify: `app/design/atoms/shared/index.ts`

- [x] **Step 1: Write failing tests for shared primitives**

Cover:
- button variants are squared and token-backed
- surface defaults are flat/outlined by variant and not rounded
- field primitives share padding/border/text tokens
- icon button focus/hover states stay accessible

- [x] **Step 2: Run targeted primitive tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/tasks-timer-ui.test.tsx
```
Expected: FAIL because the new primitives do not exist.

- [x] **Step 3: Implement the minimal atom set**

Rules:
- expose only curated variants and sizes
- no arbitrary style prop APIs
- exported public APIs need explicit types
- follow React best-practice guidance for component boundaries and prop design

- [x] **Step 4: Add compatibility re-exports where useful**

Temporarily keep `app/design/atoms/shared/*` as thin wrappers or re-exports to reduce migration risk while shifting imports progressively.

- [x] **Step 5: Re-run primitive tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/tasks-timer-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit shared atoms**

```bash
git add app/_shared/ui/index.ts app/_shared/ui/atoms app/design/atoms/shared/Button.tsx app/design/atoms/shared/index.ts app/design/auth-ui.test.tsx app/design/tasks-timer-ui.test.tsx
git commit -m "feat: add shared ui atoms"
```

---

## Task 4: Build Shared Molecules and Organisms for Real Grouping

**Files:**
- Create: `app/_shared/ui/molecules/SectionHeader.tsx`
- Create: `app/_shared/ui/molecules/EmptyState.tsx`
- Create: `app/_shared/ui/molecules/DialogFrame.tsx`
- Create: `app/_shared/ui/molecules/FormField.tsx`
- Create: `app/_shared/ui/molecules/index.ts`
- Create: `app/_shared/ui/organisms/AppPanel.tsx`
- Create: `app/_shared/ui/organisms/SidebarSection.tsx`
- Create: `app/_shared/ui/organisms/index.ts`
- Modify: `app/design/molecules/auth/LoginCard.tsx`
- Modify: `app/design/molecules/auth/AuthButton.tsx`
- Modify: `app/design/molecules/auth/SettingsSectionHeader.tsx`

- [x] **Step 1: Write failing tests for grouping primitives**

Cover:
- `AppPanel` supports only real grouping surfaces
- `DialogFrame` standardizes modal shell layout without rounded frames
- `EmptyState` and `SectionHeader` replace repeated ad hoc wrappers

- [x] **Step 2: Run targeted tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
```
Expected: FAIL because shared grouping primitives are missing.

- [x] **Step 3: Implement grouping components**

Recommended variants:
- `AppPanel`: `flat`, `outlined`, `overlay`
- `SectionHeader`: `default`, `dense`
- `EmptyState`: `default`, `error`

Ensure panels stay sober:
- square by default
- no decorative nested shells
- borders only when the grouping needs them

- [x] **Step 4: Migrate the auth molecules first**

Use the new molecules/organisms in auth UI to lock the API before wide rollout.

- [x] **Step 5: Re-run targeted tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit shared grouping layer**

```bash
git add app/_shared/ui/molecules app/_shared/ui/organisms app/design/molecules/auth/LoginCard.tsx app/design/molecules/auth/AuthButton.tsx app/design/molecules/auth/SettingsSectionHeader.tsx app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
git commit -m "feat: add shared ui grouping components"
```

---

## Task 5: Refactor App Shell Navigation and Global Layout Surfaces

**Files:**
- Modify: `app/design/organisms/navigation/AppSidebar.tsx`
- Modify: `app/design/organisms/navigation/AppMobileSidebar.tsx`
- Modify: `app/design/organisms/navigation/AppTopbar.tsx`
- Modify: `app/design/templates/app-shell/AppShellTemplate.tsx`
- Modify: `app/design/app-shell-ui.test.tsx`

- [x] **Step 1: Add failing app-shell tests**

Lock:
- no rounded shell frames by default
- navigation grouping stays legible
- logo/start control still communicates assistant state
- sidebar/mobile sidebar keep functional boundaries without decorative wrappers

- [x] **Step 2: Run app-shell tests**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx
```
Expected: FAIL.

- [x] **Step 3: Refactor the app shell to shared surfaces**

Use:
- shared `AppPanel` only where there is true grouping
- shared button/icon button primitives for navigation controls
- spacing tokens instead of raw repeated spacing classes wherever possible

- [x] **Step 4: Re-run app-shell tests**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit app-shell migration**

```bash
git add app/design/organisms/navigation/AppSidebar.tsx app/design/organisms/navigation/AppMobileSidebar.tsx app/design/organisms/navigation/AppTopbar.tsx app/design/templates/app-shell/AppShellTemplate.tsx app/design/app-shell-ui.test.tsx
git commit -m "refactor: migrate app shell to shared ui system"
```

---

## Task 6: Refactor Auth, Dashboard, and Settings Templates

**Files:**
- Modify: `app/design/templates/auth/LoginTemplate.tsx`
- Modify: `app/design/organisms/auth/LoginPanel.tsx`
- Modify: `app/design/organisms/auth/SettingsPanel.tsx`
- Modify: `app/design/templates/dashboard/DashboardCalendarTemplate.tsx`
- Modify: `app/design/templates/dashboard/DashboardTodoTemplate.tsx`
- Modify: `app/design/templates/settings/SettingsTemplate.tsx`
- Modify: `app/design/auth-ui.test.tsx`
- Modify: `app/design/dashboard-ui.test.tsx`

- [x] **Step 1: Add failing template tests**

Lock:
- dashboard sections remain grouped, but not over-wrapped
- auth/settings surfaces use the new panel language
- spacing and typography consume tokens rather than ad hoc visual wrappers

- [x] **Step 2: Run targeted template tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
```
Expected: FAIL.

- [x] **Step 3: Refactor templates and panels**

Keep legitimate grouping:
- auth login surface
- dashboard `Eventi` and `ToDo` sections
- settings sections

Remove:
- extra visual shells that only duplicate panel framing

- [x] **Step 4: Re-run targeted template tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit auth/dashboard/settings migration**

```bash
git add app/design/templates/auth/LoginTemplate.tsx app/design/organisms/auth/LoginPanel.tsx app/design/organisms/auth/SettingsPanel.tsx app/design/templates/dashboard/DashboardCalendarTemplate.tsx app/design/templates/dashboard/DashboardTodoTemplate.tsx app/design/templates/settings/SettingsTemplate.tsx app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
git commit -m "refactor: migrate auth dashboard and settings ui"
```

---

## Task 7: Refactor Calendar, Tasks, and Timer Surfaces

**Files:**
- Modify: `app/design/organisms/calendar/CalendarPanel.tsx`
- Modify: `app/design/organisms/calendar/CalendarDayGroup.tsx`
- Modify: `app/design/organisms/calendar/CalendarEventCard.tsx`
- Modify: `app/design/molecules/calendar/EventDeleteActions.tsx`
- Modify: `app/design/molecules/calendar/EventItemDetails.tsx`
- Modify: `app/design/molecules/calendar/EventItemHeader.tsx`
- Modify: `app/design/organisms/tasks/TodoPanel.tsx`
- Modify: `app/design/organisms/tasks/DashboardTodoPanel.tsx`
- Modify: `app/design/molecules/tasks/TodoListHeader.tsx`
- Modify: `app/design/molecules/tasks/TodoItem.tsx`
- Modify: `app/design/organisms/timer/TimerPanel.tsx`
- Modify: `app/design/molecules/timer/TimerControls.tsx`
- Modify: `app/design/molecules/timer/TimerReadout.tsx`
- Modify: `app/design/calendar-ui.test.tsx`
- Modify: `app/design/tasks-timer-ui.test.tsx`

- [x] **Step 1: Add failing workflow UI tests**

Cover:
- list groupings remain meaningful
- overlays/dialogs use shared dialog framing
- floating todo/timer surfaces remain functional but lose decorative rounding/wrappers

- [x] **Step 2: Run targeted tests**

Run:
```bash
npm run test -- app/design/calendar-ui.test.tsx app/design/tasks-timer-ui.test.tsx
```
Expected: FAIL.

- [x] **Step 3: Refactor list and floating tool surfaces**

Guidance:
- keep dense functional grouping
- retain overlay/floating affordances where required
- reduce glass/border usage unless still justified by a true floating utility surface

- [x] **Step 4: Re-run targeted tests**

Run:
```bash
npm run test -- app/design/calendar-ui.test.tsx app/design/tasks-timer-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit calendar/tasks/timer migration**

```bash
git add app/design/organisms/calendar/CalendarPanel.tsx app/design/organisms/calendar/CalendarDayGroup.tsx app/design/organisms/calendar/CalendarEventCard.tsx app/design/molecules/calendar/EventDeleteActions.tsx app/design/molecules/calendar/EventItemDetails.tsx app/design/molecules/calendar/EventItemHeader.tsx app/design/organisms/tasks/TodoPanel.tsx app/design/organisms/tasks/DashboardTodoPanel.tsx app/design/molecules/tasks/TodoListHeader.tsx app/design/molecules/tasks/TodoItem.tsx app/design/organisms/timer/TimerPanel.tsx app/design/molecules/timer/TimerControls.tsx app/design/molecules/timer/TimerReadout.tsx app/design/calendar-ui.test.tsx app/design/tasks-timer-ui.test.tsx
git commit -m "refactor: migrate calendar tasks and timer ui"
```

---

## Task 8: Refactor Assistant Shell Without Forcing Orb Redesign

**Files:**
- Modify: `app/design/templates/assistant/AssistantWorkspaceTemplate.tsx`
- Modify: `app/design/organisms/assistant/FloatingChat.tsx`
- Modify: `app/design/organisms/assistant/AssistantActionsLink.tsx`
- Modify: `app/design/organisms/assistant/AssistantStatusPanel.tsx`
- Modify: `app/design/molecules/assistant/FloatingChatHeader.tsx`
- Modify: `app/design/molecules/assistant/FloatingChatDeleteDialog.tsx`
- Modify: `app/design/molecules/assistant/ChatBubble.tsx`
- Modify: `app/design/molecules/assistant/AssistantStatusBlock.tsx`
- Modify: `app/design/assistant-ui.test.tsx`

- [x] **Step 1: Add failing assistant UI tests**

Lock:
- assistant layout uses shared surfaces where appropriate
- floating chat/dialog pieces adopt tokenized framing
- orb/status-dot exceptions remain explicit and allowed

- [x] **Step 2: Run assistant tests**

Run:
```bash
npm run test -- app/design/assistant-ui.test.tsx
```
Expected: FAIL.

- [x] **Step 3: Refactor assistant shell and chat surfaces**

Rules:
- do not flatten away legitimate functional overlays
- do not redesign orb behavior
- remove unnecessary rounded shells and decorative frames around assistant support UI

- [x] **Step 4: Re-run assistant tests**

Run:
```bash
npm run test -- app/design/assistant-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit assistant migration**

```bash
git add app/design/templates/assistant/AssistantWorkspaceTemplate.tsx app/design/organisms/assistant/FloatingChat.tsx app/design/organisms/assistant/AssistantActionsLink.tsx app/design/organisms/assistant/AssistantStatusPanel.tsx app/design/molecules/assistant/FloatingChatHeader.tsx app/design/molecules/assistant/FloatingChatDeleteDialog.tsx app/design/molecules/assistant/ChatBubble.tsx app/design/molecules/assistant/AssistantStatusBlock.tsx app/design/assistant-ui.test.tsx
git commit -m "refactor: migrate assistant support ui system"
```

---

## Task 9: Refactor Progression and Academy Grouping Surfaces

**Files:**
- Modify: `app/design/templates/progression/ProgressionTemplate.tsx`
- Modify: `app/design/templates/progression/ProgressionPage.tsx`
- Modify: `app/design/organisms/progression/ProgressionGoalFormDialog.tsx`
- Modify: `app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx`
- Modify: `app/design/organisms/progression/ProgressionGoalList.tsx`
- Modify: `app/design/organisms/progression/ProgressionTodayPanel.tsx`
- Modify: `app/design/organisms/progression/ProgressionXpHistorySidebar.tsx`
- Modify: `app/design/organisms/progression/ProgressionLevelSection.tsx`
- Modify: `app/design/organisms/progression/ProgressionGoalsSection.tsx`
- Modify: `app/design/organisms/progression/ProgressionTodaySection.tsx`
- Modify: `app/design/organisms/progression/ProgressionDeadlineSection.tsx`
- Modify: `app/design/templates/academy/ReelBoardTemplate.tsx`
- Modify: `app/design/organisms/academy/ReelKanbanBoard.tsx`
- Modify: `app/design/organisms/academy/ReelKanbanColumn.tsx`
- Modify: `app/design/organisms/academy/ReelCard.tsx`
- Modify: `app/design/organisms/academy/ReelQuickCreate.tsx`
- Modify: `app/design/organisms/academy/ReelEditDrawer.tsx`
- Modify: `app/design/organisms/academy/ReelDeleteDialog.tsx`
- Modify: `app/design/progression-ui.test.tsx`
- Modify: `app/design/academy-ui.test.tsx`

- [x] **Step 1: Add failing progression and academy tests**

Cover:
- progression panels remain meaningful and not over-wrapped
- academy kanban columns stay explicit grouping surfaces
- dialogs/drawers use the shared panel/dialog language
- board columns keep borders only where they clarify grouping

- [x] **Step 2: Run targeted tests**

Run:
```bash
npm run test -- app/design/progression-ui.test.tsx app/design/academy-ui.test.tsx
```
Expected: FAIL.

- [x] **Step 3: Refactor progression and academy surfaces**

Important decisions:
- keep Kanban columns as legitimate grouping wrappers
- keep progression sections when they represent real units of work/status
- remove nested decorative shells inside those units

- [x] **Step 4: Re-run targeted tests**

Run:
```bash
npm run test -- app/design/progression-ui.test.tsx app/design/academy-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit progression and academy migration**

```bash
git add app/design/templates/progression/ProgressionTemplate.tsx app/design/templates/progression/ProgressionPage.tsx app/design/organisms/progression/ProgressionGoalFormDialog.tsx app/design/organisms/progression/ProgressionDeadlineReviewDialog.tsx app/design/organisms/progression/ProgressionGoalList.tsx app/design/organisms/progression/ProgressionTodayPanel.tsx app/design/organisms/progression/ProgressionXpHistorySidebar.tsx app/design/organisms/progression/ProgressionLevelSection.tsx app/design/organisms/progression/ProgressionGoalsSection.tsx app/design/organisms/progression/ProgressionTodaySection.tsx app/design/organisms/progression/ProgressionDeadlineSection.tsx app/design/templates/academy/ReelBoardTemplate.tsx app/design/organisms/academy/ReelKanbanBoard.tsx app/design/organisms/academy/ReelKanbanColumn.tsx app/design/organisms/academy/ReelCard.tsx app/design/organisms/academy/ReelQuickCreate.tsx app/design/organisms/academy/ReelEditDrawer.tsx app/design/organisms/academy/ReelDeleteDialog.tsx app/design/progression-ui.test.tsx app/design/academy-ui.test.tsx
git commit -m "refactor: migrate progression and academy ui"
```

---

## Task 10: Collapse Imports, Remove Redundant Wrappers, and Normalize Exports

**Files:**
- Modify: `app/design/index.ts`
- Modify: `app/page.tsx`
- Modify: `app/(app-shell)/layout.tsx`
- Modify: `app/(app-shell)/dashboard/page.tsx`
- Modify: `app/(app-shell)/settings/page.tsx`
- Modify: `app/assistant/page.tsx`
- Modify: `app/(app-shell)/academy/reels/page.tsx`
- Modify: `app/(app-shell)/progression/page.tsx`

- [ ] **Step 1: Identify remaining legacy primitive imports**

Search for:
- direct imports from `app/design/atoms/*`
- duplicated panel/button implementations
- wrapper-only components that now collapse into shared surfaces

- [ ] **Step 2: Update public exports and page imports**

Ensure:
- shared primitives export from `app/_shared/ui`
- `app/design` exports only composition-level pieces
- route entrypoints remain thin

- [ ] **Step 3: Run focused smoke tests**

Run:
```bash
npm run test -- app/design/app-shell-ui.test.tsx app/design/auth-ui.test.tsx app/design/dashboard-ui.test.tsx
```
Expected: PASS.

- [ ] **Step 4: Commit import normalization**

```bash
git add app/design/index.ts app/page.tsx app/(app-shell)/layout.tsx app/(app-shell)/dashboard/page.tsx app/(app-shell)/settings/page.tsx app/assistant/page.tsx app/(app-shell)/academy/reels/page.tsx app/(app-shell)/progression/page.tsx
git commit -m "refactor: normalize shared ui imports"
```

---

## Task 11: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/ui-system-guidelines.md`
- Modify: `app/_shared/ui/tokens/README.md`

- [x] **Step 1: Update architecture documentation**

Document:
- `app/_shared/ui` ownership
- `app/design` role as composition layer
- token-first styling rules
- wrapper policy
- exception policy for raw values and circular affordances

- [x] **Step 2: Add token authoring guidance**

Explain:
- when to add a token
- when not to add a token
- how to decide whether a raw value is acceptable

- [ ] **Step 3: Commit docs**

```bash
git add README.md docs/superpowers/specs/ui-system-guidelines.md app/_shared/ui/tokens/README.md
git commit -m "docs: describe shared ui system architecture"
```

---

## Task 12: Full Verification and Cleanup

**Files:**
- Modify: any files touched above if verification reveals regressions

- [x] **Step 1: Run the complete unit/UI test suite**

Run:
```bash
npm run test
```
Expected: PASS.

- [x] **Step 2: Run lint**

Run:
```bash
npm run lint
```
Expected: PASS.

- [x] **Step 3: Run typecheck**

Run:
```bash
npm run typecheck
```
Expected: PASS.

- [ ] **Step 4: Run browser verification for key flows**

Verify manually in browser:
- login page
- dashboard
- assistant page
- progression page
- academy reels board
- settings page
- floating task/timer/chat surfaces

Expected:
- no broken layout
- no accidental loss of functional grouping
- no rounded decorative borders except explicit exceptions

- [ ] **Step 5: Final cleanup commit**

```bash
git add app README.md docs/superpowers/specs/ui-system-guidelines.md
git commit -m "refactor: finalize shared ui system rollout"
```

## Implementation Notes

- Favor migrating existing internals to shared primitives over introducing parallel one-off components.
- Keep `app/design` files small; if a design file becomes mostly shared behavior, move that shared part into `app/_shared/ui`.
- Use TDD where realistic for UI behavior and render contracts.
- Reference `vercel-react-best-practices` during implementation for component API design, state boundaries, and React 19 patterns where relevant.
- Do not force `useMemo`/`useCallback` unless the repo already needs them or profiling justifies them.
- Preserve behavior and accessibility while simplifying the visual structure.

## Risks and Watchpoints

- The biggest regression risk is over-flattening legitimate grouping surfaces.
- The biggest architecture risk is leaving half-migrated primitives inside `app/design`.
- The biggest styling risk is replacing every raw class mechanically instead of applying the token-first rule with judgment.
- The orb and similar high-specialty affordances must remain explicit exceptions, not accidental leftovers.

## Suggested Execution Order

1. Token foundation
2. Shared atoms
3. Shared molecules/organisms
4. App shell
5. Auth/dashboard/settings
6. Calendar/tasks/timer
7. Assistant support UI
8. Progression/academy
9. Import cleanup
10. Docs
11. Full verification
