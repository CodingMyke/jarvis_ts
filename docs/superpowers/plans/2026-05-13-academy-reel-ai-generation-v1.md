# Academy Reel AI Generation v1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the first AI reel generation workflow for Academy with DB-backed settings, queue, logs, a local worker, manual and scheduled triggers, and GPT-powered structured generation.

**Architecture:** Keep the existing Kanban CRUD flow in `app/_features/academy/reels`, then add a new generation layer beside it: user config, queue, run logs, generation orchestration, and local worker execution. Reuse the existing route/service/repository patterns, keep AI orchestration server-only, and use one single-reel generation service as the only place allowed to call the model and decide AI status transitions.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5 strict mode, Zod, Supabase migrations, Vercel AI SDK (`ai`, `@ai-sdk/openai`), OpenAI `gpt-4o`, Vitest + Testing Library, Tailwind CSS, `tsx` for the local worker runtime.

---

## Scope Check

This plan covers one bounded feature set: **Academy reel AI generation v1**.

In scope:
- Extend `academy_reels` with AI generation state and `hashtags` text storage
- Add per-user reel automation settings in DB
- Add DB-backed generation queue and execution logs
- Add one local worker process for scheduled and manual jobs
- Add manual global and manual field triggers from the reel drawer
- Add scheduled generation for reels in `idea`
- Add GPT generation through Vercel AI SDK with dynamic Zod schemas
- Add settings UI in `/settings`
- Update README setup and usage docs

Out of scope:
- Multi-agent generation pipelines
- Full prompt versioning or A/B prompt experimentation
- Archive/history UI for run logs
- Production cron infrastructure
- Admin/global scheduling shared across users

Repo workflow constraints:
- Follow `AGENTS.md`: **no git worktrees**
- Use a dedicated branch if implementing later
- Keep changes focused and modular

## File Structure Map

**Create**
- `supabase/migrations/20260513000000_add_reel_generation_v1.sql`
- `app/_features/academy/reels/lib/reel-generation.constants.ts`
- `app/_features/academy/reels/lib/reel-generation.types.ts`
- `app/_features/academy/reels/lib/reel-generation.schemas.ts`
- `app/_features/academy/reels/lib/reel-generation-client.ts`
- `app/_features/academy/reels/lib/reel-generation-client.test.ts`
- `app/_features/academy/reels/lib/reel-settings-client.ts`
- `app/_features/academy/reels/lib/reel-settings-client.test.ts`
- `app/_features/academy/reels/server/reel-generation.repository.ts`
- `app/_features/academy/reels/server/reel-generation.prompt.ts`
- `app/_features/academy/reels/server/reel-generation.service.ts`
- `app/_features/academy/reels/server/reel-generation.service.test.ts`
- `app/_features/academy/reels/server/reel-generation-route.schemas.ts`
- `app/_features/academy/reels/server/reel-generation-route.handlers.ts`
- `app/_features/academy/reels/server/reel-generation-route.handlers.test.ts`
- `app/_features/academy/reels/server/reel-settings.service.ts`
- `app/_features/academy/reels/server/reel-settings.service.test.ts`
- `app/_features/academy/reels/server/reel-settings-route.schemas.ts`
- `app/_features/academy/reels/server/reel-settings-route.handlers.ts`
- `app/_features/academy/reels/server/reel-settings-route.handlers.test.ts`
- `app/_features/academy/reels/server/reel-worker.service.ts`
- `app/_features/academy/reels/server/reel-worker.service.test.ts`
- `app/_server/ai/llm/openai-reel-generation.ts`
- `app/api/academy/reels/[reelId]/generate/route.ts`
- `app/api/academy/reels/[reelId]/generate/[field]/route.ts`
- `app/api/academy/reels/settings/route.ts`
- `app/design/organisms/academy/ReelGenerationButton.tsx`
- `app/design/organisms/settings/ReelAutomationSettingsPanel.tsx`
- `scripts/reels-worker.ts`

**Modify**
- `package.json`
- `README.md`
- `app/_server/supabase/database.types.ts`
- `app/_features/academy/reels/index.ts`
- `app/_features/academy/reels/lib/reel-board.constants.ts`
- `app/_features/academy/reels/lib/reel-board.types.ts`
- `app/_features/academy/reels/lib/reel-board.schemas.ts`
- `app/_features/academy/reels/lib/reel-board-client.ts`
- `app/_features/academy/reels/lib/reel-board-client.test.ts`
- `app/_features/academy/reels/server/reel-board.repository.ts`
- `app/_features/academy/reels/server/reel-board.service.ts`
- `app/_features/academy/reels/server/reel-board.service.test.ts`
- `app/_features/academy/reels/server/reel-board-route.schemas.ts`
- `app/_features/academy/reels/server/reel-board-route.handlers.ts`
- `app/_features/academy/reels/server/reel-board-route.handlers.test.ts`
- `app/api/academy/reels/route.ts`
- `app/api/academy/reels/[reelId]/route.ts`
- `app/design/organisms/academy/ReelEditDrawer.tsx`
- `app/design/templates/academy/useReelBoardWorkspace.ts`
- `app/design/templates/academy/useReelBoardWorkspace.test.tsx`
- `app/design/templates/academy/ReelBoardTemplate.tsx`
- `app/design/academy-ui.test.tsx`
- `app/design/organisms/auth/SettingsPanel.tsx`
- `app/design/auth-ui.test.tsx`
- `docs/academy-reel-agent-v1-architecture.md`

## Implementation Notes

- Use tracked migrations only for DB structure changes.
- Regenerate Supabase types after the migration.
- Keep `status` and `generationStatus` separate everywhere.
- Switch `hashtags` from array semantics to plain text semantics everywhere in one coherent pass.
- Use backend-owned target-field computation for every generation path.
- Reuse HTTP helper and auth patterns already present in other routes.
- Prefer TDD for each service/route/UI slice.

---

### Task 1: Add dependencies and database schema for reel generation

**Files:**
- Modify: `package.json`
- Create: `supabase/migrations/20260513000000_add_reel_generation_v1.sql`
- Modify: `app/_server/supabase/database.types.ts`
- Test: `app/_features/academy/reels/server/reel-board.service.test.ts`

- [x] **Step 1: Add the failing DB-oriented assertions to the reel service tests**

Cover these expectations:
- reel rows expose `generation_status`
- reel rows expose `hashtags` as `string | null`
- insert/update types accept `generation_status`
- new user-scoped settings, queue, and run-log entities are expected by the service layer

- [x] **Step 2: Run the targeted test file to confirm failure**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: FAIL because the current DB contract does not expose generation fields/tables.

- [x] **Step 3: Add package dependencies and worker script entry**

Update `package.json`:
- add runtime deps: `ai`, `@ai-sdk/openai`
- add dev dep: `tsx`
- add script: `reels:worker`

- [x] **Step 4: Write the migration**

The migration should:
- change `academy_reels.hashtags` from `text[] not null default '{}'` to `text`
- add `generation_status text not null default 'not_generated'`
- add a check constraint for `generation_status in ('not_generated','processing','completed','failed')`
- create a per-user settings table for:
  - `enabled`
  - `run_times jsonb`
  - `editorial_context text`
  - timestamps
- create a queue table for operational jobs
- create a unified run-log table with `run_type`, `trigger_source`, optional `parent_run_id`, scheduling metadata, summary, details, prompt and output snapshots
- create RLS and owner-scoped policies for settings/jobs/logs
- create DB helpers needed to insert the default settings record when the user profile is created

- [x] **Step 5: Regenerate Supabase types**

Run:
```bash
npm run gen-supabase-types
```
Expected: `app/_server/supabase/database.types.ts` includes the new reel generation tables and updated `academy_reels` shape.

- [x] **Step 6: Re-run the targeted test**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: either PASS for contract assertions or fail later in service logic, proving the DB contract is now available.

- [x] **Step 7: Commit the schema foundation**

```bash
git add package.json package-lock.json supabase/migrations/20260513000000_add_reel_generation_v1.sql app/_server/supabase/database.types.ts app/_features/academy/reels/server/reel-board.service.test.ts
git commit -m "feat: add reel generation database foundation"
```

---

### Task 2: Extend reel domain contracts and board service for generation-aware reels

**Files:**
- Modify: `app/_features/academy/reels/lib/reel-board.constants.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.types.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.schemas.ts`
- Modify: `app/_features/academy/reels/index.ts`
- Modify: `app/_features/academy/reels/server/reel-board.repository.ts`
- Modify: `app/_features/academy/reels/server/reel-board.service.ts`
- Modify: `app/_features/academy/reels/server/reel-board.service.test.ts`

- [x] **Step 1: Expand the failing domain tests**

Add coverage for:
- allowed generation statuses exactly: `not_generated`, `processing`, `completed`, `failed`
- `hashtags` uses plain text semantics instead of array semantics
- "field is complete" means `trim().length > 0`
- reel sorting and grouping still work with the expanded row shape

- [x] **Step 2: Run the service tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: FAIL because domain contracts still use old `hashtags` and no generation status logic.

- [x] **Step 3: Update exported contracts**

Implement:
- board constants for generation statuses
- updated `ReelRow`, `UpdateReelInput`, and helper types
- Zod schemas with `hashtags: z.string().nullable()`
- exported helpers for "missing AI field" and "complete AI payload" checks

- [x] **Step 4: Update repository and board service shaping**

Keep existing CRUD behavior intact while:
- reading/writing `hashtags` as text
- preserving `generation_status`
- normalizing nullable text consistently

- [x] **Step 5: Re-run the service tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit the domain contract update**

```bash
git add app/_features/academy/reels/lib/reel-board.constants.ts app/_features/academy/reels/lib/reel-board.types.ts app/_features/academy/reels/lib/reel-board.schemas.ts app/_features/academy/reels/index.ts app/_features/academy/reels/server/reel-board.repository.ts app/_features/academy/reels/server/reel-board.service.ts app/_features/academy/reels/server/reel-board.service.test.ts
git commit -m "feat: extend reel board contracts for generation"
```

---

### Task 3: Define generation contracts, settings contracts, and queue/log repository primitives

**Files:**
- Create: `app/_features/academy/reels/lib/reel-generation.constants.ts`
- Create: `app/_features/academy/reels/lib/reel-generation.types.ts`
- Create: `app/_features/academy/reels/lib/reel-generation.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-generation.repository.ts`
- Create: `app/_features/academy/reels/server/reel-settings.service.ts`
- Create: `app/_features/academy/reels/server/reel-settings.service.test.ts`

- [x] **Step 1: Write failing tests for settings and repository primitives**

Cover:
- settings validation for `enabled`, `runTimes`, and optional `editorialContext`
- `enabled=true` requires at least one run time
- run times are `HH:mm`, unique, and sorted ascending
- repository helpers can query pending jobs, insert jobs, insert logs, and detect duplicate scheduled slots

- [x] **Step 2: Run the new tests to confirm failure**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-settings.service.test.ts
```
Expected: FAIL because generation/settings contracts do not exist yet.

- [x] **Step 3: Implement generation and settings schemas**

Define contracts for:
- trigger sources: `scheduled | manual_global | manual_field`
- run types: `batch | reel`
- queue job status: start with the minimum needed for `pending | processing | completed | failed`
- target field unions
- settings payloads and normalized run-time helpers

- [x] **Step 4: Implement repository primitives**

Add focused DB helpers for:
- loading the user settings record
- updating settings
- inserting manual jobs
- inserting scheduled batch parent logs
- inserting reel child logs
- loading and claiming pending jobs
- checking whether a scheduled slot was already run for a local date/timezone

- [x] **Step 5: Re-run the settings/repository tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-settings.service.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit contracts and repository primitives**

```bash
git add app/_features/academy/reels/lib/reel-generation.constants.ts app/_features/academy/reels/lib/reel-generation.types.ts app/_features/academy/reels/lib/reel-generation.schemas.ts app/_features/academy/reels/server/reel-generation.repository.ts app/_features/academy/reels/server/reel-settings.service.ts app/_features/academy/reels/server/reel-settings.service.test.ts
git commit -m "feat: add reel generation contracts and settings repository"
```

---

### Task 4: Add the GPT generation provider and single-reel generation service

**Files:**
- Create: `app/_server/ai/llm/openai-reel-generation.ts`
- Create: `app/_features/academy/reels/server/reel-generation.prompt.ts`
- Create: `app/_features/academy/reels/server/reel-generation.service.ts`
- Create: `app/_features/academy/reels/server/reel-generation.service.test.ts`

- [x] **Step 1: Write failing generation service tests**

Cover:
- global mode requests only missing fields
- field mode requests only the selected field
- prompt includes idea, existing fields, optional editorial context, and body/hashtags formatting rules
- dynamic Zod output schema matches `targetFields`
- success sets reel `generation_status` to `completed`
- partial miss sets reel `generation_status` to `failed`
- global success moves `idea -> script` only when all AI fields are complete
- field mode never changes Kanban status

- [x] **Step 2: Run the service tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-generation.service.test.ts
```
Expected: FAIL because the service and provider do not exist.

- [x] **Step 3: Implement the OpenAI provider wrapper**

Use Vercel AI SDK:
- provider: `@ai-sdk/openai`
- model: hardcoded `gpt-4o`
- structured generation: `generateObject`

Keep this wrapper thin:
- accept prompt text
- accept a dynamic Zod schema
- return both parsed object and raw model text/object for logging

- [x] **Step 4: Implement prompt builder and service orchestration**

The service must:
- load reel and settings context
- compute missing fields backend-side
- reject work if there are no target fields for global mode
- mark reel `processing`
- call the provider
- normalize and persist outputs
- set `completed` or `failed`
- decide `idea -> script`
- return a structured execution result for worker/logging

- [x] **Step 5: Re-run the service tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-generation.service.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit the generation engine**

```bash
git add app/_server/ai/llm/openai-reel-generation.ts app/_features/academy/reels/server/reel-generation.prompt.ts app/_features/academy/reels/server/reel-generation.service.ts app/_features/academy/reels/server/reel-generation.service.test.ts
git commit -m "feat: add gpt reel generation service"
```

---

### Task 5: Add manual generation APIs and client helpers

**Files:**
- Create: `app/_features/academy/reels/server/reel-generation-route.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-generation-route.handlers.ts`
- Create: `app/_features/academy/reels/server/reel-generation-route.handlers.test.ts`
- Create: `app/_features/academy/reels/lib/reel-generation-client.ts`
- Create: `app/_features/academy/reels/lib/reel-generation-client.test.ts`
- Create: `app/api/academy/reels/[reelId]/generate/route.ts`
- Create: `app/api/academy/reels/[reelId]/generate/[field]/route.ts`

- [x] **Step 1: Write failing route and client tests**

Cover:
- manual global endpoint saves a job for one reel
- manual field endpoint validates allowed field names
- endpoints reject when a job already exists for the reel
- endpoints return fast success with queued state instead of doing the generation inline
- client helpers surface useful error messages

- [x] **Step 2: Run the targeted tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-generation-route.handlers.test.ts app/_features/academy/reels/lib/reel-generation-client.test.ts
```
Expected: FAIL because endpoints and client helpers are missing.

- [x] **Step 3: Implement route schemas and handlers**

Use existing route patterns:
- cookie auth
- Zod input validation
- service/repository delegation
- consistent JSON success/error shape

Queue behavior:
- global trigger enqueues only if at least one field is missing
- field trigger enqueues only if no job is already pending/processing

- [x] **Step 4: Implement client functions**

Add helpers for:
- `queueGlobalReelGeneration(reelId)`
- `queueFieldReelGeneration(reelId, field)`

- [x] **Step 5: Re-run route and client tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-generation-route.handlers.test.ts app/_features/academy/reels/lib/reel-generation-client.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit the manual generation APIs**

```bash
git add app/_features/academy/reels/server/reel-generation-route.schemas.ts app/_features/academy/reels/server/reel-generation-route.handlers.ts app/_features/academy/reels/server/reel-generation-route.handlers.test.ts app/_features/academy/reels/lib/reel-generation-client.ts app/_features/academy/reels/lib/reel-generation-client.test.ts app/api/academy/reels/[reelId]/generate/route.ts app/api/academy/reels/[reelId]/generate/[field]/route.ts
git commit -m "feat: add manual reel generation endpoints"
```

---

### Task 6: Add settings APIs and user-facing settings data flow

**Files:**
- Create: `app/_features/academy/reels/server/reel-settings-route.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-settings-route.handlers.ts`
- Create: `app/_features/academy/reels/server/reel-settings-route.handlers.test.ts`
- Create: `app/_features/academy/reels/lib/reel-settings-client.ts`
- Create: `app/_features/academy/reels/lib/reel-settings-client.test.ts`
- Create: `app/api/academy/reels/settings/route.ts`

- [x] **Step 1: Write failing settings API tests**

Cover:
- GET returns the existing per-user settings record
- PATCH updates `enabled`, `runTimes`, and `editorialContext`
- `enabled=true` with empty `runTimes` is rejected
- run times are normalized before persistence

- [x] **Step 2: Run the settings API tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts
```
Expected: FAIL because the route layer and client do not exist.

- [x] **Step 3: Implement handlers and route**

The route should:
- use auth
- load the current user settings record
- validate payloads
- update only allowed settings fields

- [x] **Step 4: Implement client helpers**

Add:
- `getReelAutomationSettings()`
- `updateReelAutomationSettings(input)`

- [x] **Step 5: Re-run the settings API tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit the settings API layer**

```bash
git add app/_features/academy/reels/server/reel-settings-route.schemas.ts app/_features/academy/reels/server/reel-settings-route.handlers.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/lib/reel-settings-client.ts app/_features/academy/reels/lib/reel-settings-client.test.ts app/api/academy/reels/settings/route.ts
git commit -m "feat: add reel automation settings endpoints"
```

---

### Task 7: Build the local worker and scheduled batch orchestration

**Files:**
- Create: `app/_features/academy/reels/server/reel-worker.service.ts`
- Create: `app/_features/academy/reels/server/reel-worker.service.test.ts`
- Create: `scripts/reels-worker.ts`
- Modify: `package.json`

- [x] **Step 1: Write failing worker tests**

Cover:
- worker prioritizes manual jobs before scheduled jobs
- FIFO order inside each priority group
- scheduled slot runs only once per local date/time slot
- scheduled batches process `idea` reels oldest to newest
- reel-local failures do not stop the batch
- infrastructure failures stop the batch and mark the parent run `failed`
- scheduled processing creates a batch parent log and reel child logs

- [x] **Step 2: Run the worker tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-worker.service.test.ts
```
Expected: FAIL because worker orchestration does not exist.

- [x] **Step 3: Implement worker service**

The service should:
- poll for pending manual jobs
- compute due scheduled slots from user settings + progression timezone
- create scheduled batch parent runs
- enqueue scheduled reel jobs
- claim one queue item at a time
- call `reel-generation.service.ts`
- write/update logs

- [x] **Step 4: Implement the executable script**

`scripts/reels-worker.ts` should:
- boot the service
- run a polling loop
- log enough operational information for local debugging
- exit non-zero on unrecoverable startup/config errors

- [x] **Step 5: Re-run the worker tests**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-worker.service.test.ts
```
Expected: PASS.

- [x] **Step 6: Commit the worker**

```bash
git add app/_features/academy/reels/server/reel-worker.service.ts app/_features/academy/reels/server/reel-worker.service.test.ts scripts/reels-worker.ts package.json package-lock.json
git commit -m "feat: add local reel generation worker"
```

---

### Task 8: Integrate manual generation into the Academy reel drawer and board workspace

**Files:**
- Modify: `app/design/organisms/academy/ReelEditDrawer.tsx`
- Create: `app/design/organisms/academy/ReelGenerationButton.tsx`
- Modify: `app/design/templates/academy/useReelBoardWorkspace.ts`
- Modify: `app/design/templates/academy/useReelBoardWorkspace.test.tsx`
- Modify: `app/design/templates/academy/ReelBoardTemplate.tsx`
- Modify: `app/design/academy-ui.test.tsx`
- Modify: `app/_features/academy/reels/index.ts`

- [x] **Step 1: Write failing UI/workspace tests**

Cover:
- global generate button appears in the drawer header
- field-level generate buttons appear for all four AI fields
- global button is disabled when all AI fields are already populated
- all generation buttons are disabled while `generation_status = processing`
- global generation saves current draft before queueing
- field generation saves current draft before queueing

- [x] **Step 2: Run the academy UI tests**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx app/design/templates/academy/useReelBoardWorkspace.test.tsx
```
Expected: FAIL because the drawer/workspace does not support generation actions yet.

- [x] **Step 3: Update the workspace hook**

Integrate:
- manual global queue helper
- manual field queue helper
- saving draft before queueing
- disabling logic based on `generation_status` and missing-field computation
- board replacement after queue/save responses

- [x] **Step 4: Update the drawer UI**

Refactor `ReelEditDrawer.tsx` to:
- show generation actions clearly
- treat `hashtags` as plain text
- keep `body` and `caption` editing usable
- avoid nested label markup bugs while touching the component

- [x] **Step 5: Re-run the academy UI tests**

Run:
```bash
npm run test -- app/design/academy-ui.test.tsx app/design/templates/academy/useReelBoardWorkspace.test.tsx
```
Expected: PASS.

- [x] **Step 6: Commit the Academy UI integration**

```bash
git add app/design/organisms/academy/ReelEditDrawer.tsx app/design/organisms/academy/ReelGenerationButton.tsx app/design/templates/academy/useReelBoardWorkspace.ts app/design/templates/academy/useReelBoardWorkspace.test.tsx app/design/templates/academy/ReelBoardTemplate.tsx app/design/academy-ui.test.tsx app/_features/academy/reels/index.ts
git commit -m "feat: add manual reel generation controls"
```

---

### Task 9: Add reel automation settings UI to `/settings`

**Files:**
- Create: `app/design/organisms/settings/ReelAutomationSettingsPanel.tsx`
- Modify: `app/design/organisms/auth/SettingsPanel.tsx`
- Modify: `app/design/auth-ui.test.tsx`

- [x] **Step 1: Write failing settings UI tests**

Cover:
- authenticated settings page renders a Reel automation section
- section shows enabled toggle, editable run times, and editorial context textarea
- enabling without at least one run time is prevented
- saved settings reflect backend-normalized run times

- [x] **Step 2: Run the settings UI tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx
```
Expected: FAIL because the settings UI does not include reel automation controls.

- [x] **Step 3: Implement the settings panel**

Build a focused component that:
- loads the current settings record
- edits `enabled`, `runTimes`, and `editorialContext`
- validates locally before submit
- persists through the new settings client helpers

- [x] **Step 4: Embed the panel into `SettingsPanel`**

Keep the current account and integrations sections intact while adding a third section for reel automation.

- [x] **Step 5: Re-run the settings UI tests**

Run:
```bash
npm run test -- app/design/auth-ui.test.tsx
```
Expected: PASS.

- [x] **Step 6: Commit the settings UI**

```bash
git add app/design/organisms/settings/ReelAutomationSettingsPanel.tsx app/design/organisms/auth/SettingsPanel.tsx app/design/auth-ui.test.tsx
git commit -m "feat: add reel automation settings ui"
```

---

### Task 10: Final verification and documentation updates

**Files:**
- Modify: `README.md`
- Modify: `docs/academy-reel-agent-v1-architecture.md`

- [x] **Step 1: Update README setup and feature documentation**

Document:
- new OpenAI/Vercel AI SDK dependency and `OPENAI_API_KEY`
- `npm run reels:worker`
- Academy reel AI generation behavior and settings location

- [x] **Step 2: Reconcile the spec with any implementation-driven naming adjustments**

Only update `docs/academy-reel-agent-v1-architecture.md` if file names, route names, or table names changed during implementation.

- [x] **Step 3: Run the focused test suite for the feature**

Run:
```bash
npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-settings.service.test.ts app/_features/academy/reels/server/reel-generation.service.test.ts app/_features/academy/reels/server/reel-generation-route.handlers.test.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts app/design/academy-ui.test.tsx app/design/auth-ui.test.tsx app/design/templates/academy/useReelBoardWorkspace.test.tsx
```
Expected: PASS.

- [x] **Step 4: Run project lint**

Run:
```bash
npm run lint
```
Expected: PASS.

- [x] **Step 5: Run project typecheck**

Run:
```bash
npm run typecheck
```
Expected: PASS.

- [x] **Step 6: Commit docs and verification pass**

```bash
git add README.md docs/academy-reel-agent-v1-architecture.md
git commit -m "docs: document academy reel ai generation"
```

---

## Execution Order Summary

Implement in this order:

1. DB schema and dependencies
2. Reel domain contract updates
3. Settings and repository primitives
4. GPT generation service
5. Manual generation APIs
6. Settings APIs
7. Worker orchestration
8. Reel drawer and board integration
9. Settings UI
10. Final docs and verification

## Risks to Watch

- `hashtags` migration touches DB, types, client parsing, and drawer UI at once
- user-profile bootstrap for the settings record must stay consistent with existing auth/profile flows
- local worker runtime must be simple enough to boot reliably on this repo
- queue and log separation must stay strict to avoid mixing operational and audit state
- scheduled de-duplication must use local date + slot + timezone, not only UTC timestamps

## Suggested Commit Sequence

1. `feat: add reel generation database foundation`
2. `feat: extend reel board contracts for generation`
3. `feat: add reel generation contracts and settings repository`
4. `feat: add gpt reel generation service`
5. `feat: add manual reel generation endpoints`
6. `feat: add reel automation settings endpoints`
7. `feat: add local reel generation worker`
8. `feat: add manual reel generation controls`
9. `feat: add reel automation settings ui`
10. `docs: document academy reel ai generation`
