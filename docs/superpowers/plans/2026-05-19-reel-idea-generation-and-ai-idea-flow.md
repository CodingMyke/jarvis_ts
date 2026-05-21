# Reel Idea Generation and AI Idea Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `Reel Idea Generation` flow, `ai_idea` board status, rejected-idea persistence, manual AI-idea triggering, and spawned run-process orchestration without regressing the existing `Reel Scripting` flow.

**Architecture:** Keep one reel automation settings record per user, but split the config into `reelScripting` and `reelIdeaGeneration` sections. Extend the reel domain with `ai_idea`, `origin`, and rejected-idea persistence, then add a dedicated idea-generation service that builds prompt context from published reels, memories, and rejected ideas. Refactor orchestration so the polling worker only discovers due runs and spawns one child process per due flow run.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Vitest, Supabase Postgres/RLS, local `tsx` worker scripts, Vercel AI SDK/OpenAI integration.

---

## File Structure

### Database and generated types

- Create: `supabase/migrations/20260519000000_add_reel_idea_generation_flow.sql`
- Modify: `app/_server/supabase/database.types.ts`

### Task 0: Create the dedicated implementation branch

**Files:**
- Modify: none

- [x] **Step 1: Create and switch to the dedicated feature branch**

```bash
git checkout -b codex/reel-idea-generation-ai-idea-flow
```

- [x] **Step 2: Verify the branch is active before touching files**

Run: `git branch --show-current`
Expected: `codex/reel-idea-generation-ai-idea-flow`

---


### Reel shared contracts and settings

- Modify: `app/_features/academy/reels/lib/reel-board.constants.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.types.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.schemas.ts`
- Modify: `app/_features/academy/reels/lib/reel-generation.types.ts`
- Modify: `app/_features/academy/reels/lib/reel-generation.schemas.ts`
- Modify: `app/_features/academy/reels/lib/reel-board-client.ts`
- Modify: `app/_features/academy/reels/lib/reel-settings-client.ts`
- Modify: `app/_features/academy/reels/index.ts`
- Test: `app/_features/academy/reels/lib/reel-board-client.test.ts`
- Test: `app/_features/academy/reels/lib/reel-settings-client.test.ts`

### Reel domain services and repositories

- Modify: `app/_features/academy/reels/server/reel-board.repository.ts`
- Modify: `app/_features/academy/reels/server/reel-board.service.ts`
- Modify: `app/_features/academy/reels/server/reel-board-route.schemas.ts`
- Modify: `app/_features/academy/reels/server/reel-board-route.handlers.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.repository.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.prompt.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.service.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation-route.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation-route.handlers.ts`
- Modify: `app/_features/academy/reels/server/reel-generation.repository.ts`
- Modify: `app/_features/academy/reels/server/reel-generation.service.ts`
- Test: `app/_features/academy/reels/server/reel-board.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-generation.repository.test.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.service.test.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts`

### API routes and worker orchestration

- Create: `app/api/academy/reels/idea-generation/route.ts`
- Modify: `app/api/academy/reels/[reelId]/route.ts`
- Modify: `app/api/academy/reels/[reelId]/status/route.ts`
- Modify: `app/api/academy/reels/settings/route.ts`
- Modify: `app/_features/academy/reels/server/reel-settings.service.ts`
- Modify: `app/_features/academy/reels/server/reel-settings-route.schemas.ts`
- Modify: `app/_features/academy/reels/server/reel-settings-route.handlers.ts`
- Modify: `app/_features/academy/reels/server/reel-worker.service.ts`
- Create: `app/_features/academy/reels/server/reel-automation-runner.service.ts`
- Create: `scripts/reel-automation-run.ts`
- Modify: `scripts/reels-worker.ts`
- Test: `app/_features/academy/reels/server/reel-settings.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-settings-route.handlers.test.ts`
- Test: `app/_features/academy/reels/server/reel-worker.service.test.ts`

### UI and interaction surface

- Modify: `app/design/organisms/settings/ReelAutomationSettingsPanel.tsx`
- Modify: `app/(app-shell)/academy/automation/page.tsx`
- Modify: `app/design/templates/academy/useReelBoardWorkspace.ts`
- Modify: `app/design/organisms/academy/ReelKanbanBoard.tsx`
- Modify: `app/design/organisms/academy/ReelKanbanColumn.tsx`
- Modify: `app/design/organisms/academy/ReelEditDrawer.tsx`
- Modify: `app/design/organisms/academy/ReelCard.tsx`
- Test: `app/design/academy-ui.test.tsx`
- Test: `app/design/auth-ui.test.tsx`
- Test: `app/design/organisms/academy/ReelCard.test.tsx`

### Documentation

- Modify: `README.md`
- Modify: `docs/academy-reel-agent-v1-architecture.md`
- Modify: `docs/superpowers/specs/2026-05-15-reel-idea-generation-design.md`
- Modify: `docs/adr/0001-reel-automation-run-process-model.md`

### Task 1: Add database support for `ai_idea`, `origin`, run records, and rejected ideas

**Files:**
- Create: `supabase/migrations/20260519000000_add_reel_idea_generation_flow.sql`
- Modify: `app/_server/supabase/database.types.ts`
- Test: `app/_features/academy/reels/server/reel-board.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-generation.repository.test.ts`

- [x] **Step 1: Write the failing DB-oriented assertions for the new reel shape and persistence rules**

```ts
it("surfaces ai_idea reels with immutable origin, nullable published_at, and last idea generation run id", async () => {
  expectTypeOf<ReelStatus>().toEqualTypeOf<
    "ai_idea" | "idea" | "script" | "to_record" | "to_edit" | "ready" | "published"
  >();

  expectTypeOf<ReelRow["origin"]>().toEqualTypeOf<"manual" | "ai_idea_generation">();
  expectTypeOf<ReelRow["last_idea_generation_run_id"]>().toEqualTypeOf<string | null>();
});

it("persists rejected ai ideas as dedicated snapshots", async () => {
  const row = await repository.saveRejectedIdeaSnapshot(supabase, {
    userId: "user-1",
    reelId: "reel-1",
    origin: "ai_idea_generation",
    idea: "Rejected idea",
    rejectedAt: "2026-05-19T08:00:00.000Z",
  });

  expect(row.origin).toBe("ai_idea_generation");
  expect(row.idea).toBe("Rejected idea");
});
```

- [x] **Step 2: Run the targeted tests to verify the shape is missing**

Run: `npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-generation.repository.test.ts`
Expected: FAIL with missing `ai_idea` / `origin` / rejected-idea support.

- [x] **Step 3: Write the migration with the new schema and constraints**

```sql
alter table public.academy_reels
  drop constraint academy_reels_status_check,
  add constraint academy_reels_status_check
    check (status in ('ai_idea', 'idea', 'script', 'to_record', 'to_edit', 'ready', 'published'));

alter table public.academy_reels
  add column origin text not null default 'manual'
    check (origin in ('manual', 'ai_idea_generation')),
  add column last_idea_generation_run_id uuid;

create table public.academy_reel_rejected_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid,
  origin text not null check (origin in ('manual', 'ai_idea_generation')),
  idea text not null,
  title text,
  caption text,
  body text,
  hashtags text,
  notes text,
  run_id uuid,
  rejected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.academy_reel_automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow text not null check (flow in ('reel_scripting', 'reel_idea_generation')),
  trigger text not null check (trigger in ('scheduled', 'manual')),
  slot timestamptz,
  status text not null check (status in ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.academy_reel_transition_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null,
  from_status text not null,
  to_status text not null,
  action text not null check (action in ('approve_ai_idea', 'manual_move')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index academy_reel_rejected_ideas_user_rejected_at_idx
  on public.academy_reel_rejected_ideas (user_id, rejected_at desc);

create index academy_reel_automation_runs_user_flow_status_idx
  on public.academy_reel_automation_runs (user_id, flow, status, created_at desc);

create index academy_reel_transition_events_user_created_at_idx
  on public.academy_reel_transition_events (user_id, created_at desc);

alter table public.academy_reel_rejected_ideas enable row level security;
alter table public.academy_reel_automation_runs enable row level security;
alter table public.academy_reel_transition_events enable row level security;

create policy academy_reel_rejected_ideas_own_rows
  on public.academy_reel_rejected_ideas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_automation_runs_own_rows
  on public.academy_reel_automation_runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_transition_events_own_rows
  on public.academy_reel_transition_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [x] **Step 4: Regenerate Supabase types with @supabase and verify the new tables/columns appear**

Run: `npm run gen-supabase-types`
Expected: `app/_server/supabase/database.types.ts` now includes `academy_reels.origin`, `academy_reel_rejected_ideas`, and `academy_reel_automation_runs`.

- [x] **Step 5: Re-run the targeted tests and confirm the DB contract is now available**

Run: `npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-generation.repository.test.ts`
Expected: PASS for type-oriented assertions or FAIL later in service behavior, not at schema shape.

- [x] **Step 6: Commit the database foundation**

```bash
git add supabase/migrations/20260519000000_add_reel_idea_generation_flow.sql app/_server/supabase/database.types.ts app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-generation.repository.test.ts
git commit -m "feat: add reel idea generation database foundation"
```

### Task 2: Extend shared reel contracts and nested automation settings

**Files:**
- Modify: `app/_features/academy/reels/lib/reel-board.constants.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.types.ts`
- Modify: `app/_features/academy/reels/lib/reel-board.schemas.ts`
- Modify: `app/_features/academy/reels/lib/reel-generation.types.ts`
- Modify: `app/_features/academy/reels/lib/reel-generation.schemas.ts`
- Modify: `app/_features/academy/reels/lib/reel-board-client.ts`
- Modify: `app/_features/academy/reels/lib/reel-settings-client.ts`
- Modify: `app/_features/academy/reels/index.ts`
- Test: `app/_features/academy/reels/lib/reel-board-client.test.ts`
- Test: `app/_features/academy/reels/lib/reel-settings-client.test.ts`

- [x] **Step 1: Write failing contract tests for `ai_idea`, `origin`, and nested settings validation**

```ts
it("parses nested automation settings with reel idea generation defaults", () => {
  const parsed = reelAutomationSettingsSchema.parse({
    reelScripting: {
      enabled: false,
      runTimes: ["09:00"],
      scriptingContext: null,
    },
    reelIdeaGeneration: {
      enabled: true,
      runTimes: ["10:00", "10:15"],
      ideasPerRun: 3,
      maxPendingAiIdeas: 10,
      latestPublishedReelsCount: 3,
      ideaGenerationContext: null,
    },
  });

  expect(parsed.reelIdeaGeneration.latestPublishedReelsCount).toBe(3);
});

it("rejects run times closer than 10 minutes inside the same flow", async () => {
  const result = await updateReelAutomationSettings({
    reelIdeaGeneration: {
      enabled: true,
      runTimes: ["10:00", "10:08"],
      ideasPerRun: 3,
      maxPendingAiIdeas: 10,
      latestPublishedReelsCount: 3,
      ideaGenerationContext: null,
    },
  });

  expect(result).toMatchObject({ success: false, status: 400 });
});
```

- [x] **Step 2: Run the client/contract tests to verify the current flat schema fails**

Run: `npm run test -- app/_features/academy/reels/lib/reel-board-client.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts`
Expected: FAIL because `ai_idea`, `origin`, and nested settings are not recognized.

- [x] **Step 3: Update constants, types, and Zod schemas for the new domain shape**

```ts
export const REEL_BOARD_STATUSES = [
  "ai_idea",
  "idea",
  "script",
  "to_record",
  "to_edit",
  "ready",
  "published",
] as const;

export const REEL_ORIGINS = ["manual", "ai_idea_generation"] as const;

export interface ReelAutomationSettings {
  reelScripting: {
    enabled: boolean;
    runTimes: string[];
    scriptingContext: string | null;
  };
  reelIdeaGeneration: {
    enabled: boolean;
    runTimes: string[];
    ideasPerRun: number;
    maxPendingAiIdeas: number;
    latestPublishedReelsCount: number;
    ideaGenerationContext: string | null;
  };
}
```

- [x] **Step 4: Update the API clients to send and receive the full nested settings payload**

```ts
const response = await fetch("/api/academy/reels/settings", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    reelScripting: payload.reelScripting,
    reelIdeaGeneration: payload.reelIdeaGeneration,
  }),
});
```

- [x] **Step 5: Re-run the client/contract tests and confirm the new shape validates**

Run: `npm run test -- app/_features/academy/reels/lib/reel-board-client.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts`
Expected: PASS.

- [x] **Step 6: Commit the shared contract layer**

```bash
git add app/_features/academy/reels/lib/reel-board.constants.ts app/_features/academy/reels/lib/reel-board.types.ts app/_features/academy/reels/lib/reel-board.schemas.ts app/_features/academy/reels/lib/reel-generation.types.ts app/_features/academy/reels/lib/reel-generation.schemas.ts app/_features/academy/reels/lib/reel-board-client.ts app/_features/academy/reels/lib/reel-settings-client.ts app/_features/academy/reels/index.ts app/_features/academy/reels/lib/reel-board-client.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts
git commit -m "feat: extend reel contracts for ai idea flow"
```

### Task 3: Implement domain rules for `ai_idea`, origin, approval semantics, and rejected idea snapshots

**Files:**
- Modify: `app/_features/academy/reels/server/reel-board.repository.ts`
- Modify: `app/_features/academy/reels/server/reel-board.service.ts`
- Modify: `app/_features/academy/reels/server/reel-board-route.schemas.ts`
- Modify: `app/_features/academy/reels/server/reel-board-route.handlers.ts`
- Modify: `app/api/academy/reels/[reelId]/route.ts`
- Modify: `app/api/academy/reels/[reelId]/status/route.ts`
- Test: `app/_features/academy/reels/server/reel-board.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-board-route.handlers.test.ts`

- [x] **Step 1: Write failing service tests for the new board rules**

```ts
it("prevents manual moves into ai_idea", async () => {
  const result = await updateReelStatus(supabase, userId, reelId, { status: "ai_idea" });
  expect(result).toEqual({
    success: false,
    error: "INVALID_STATUS_TRANSITION",
    message: "Only Reel Idea Generation may place reels in ai_idea",
  });
});

it("keeps origin immutable across reel edits", async () => {
  const result = await updateReel(supabase, userId, reelId, {
    title: "Edited",
    // @ts-expect-error test payload intentionally invalid
    origin: "manual",
  });

  expect(result).toEqual({
    success: false,
    error: "IMMUTABLE_FIELD",
    message: "origin cannot be changed",
  });
});

it("records approve and manual move as distinct transition events", async () => {
  await approveAiIdea(supabase, userId, reelId, { idea: "Approved idea" });
  expect(repository.insertTransitionEvent).toHaveBeenCalledWith(
    supabase,
    expect.objectContaining({ action: "approve_ai_idea", fromStatus: "ai_idea", toStatus: "idea" }),
  );

  await updateReelStatus(supabase, userId, reelId, { status: "script" });
  expect(repository.insertTransitionEvent).toHaveBeenCalledWith(
    supabase,
    expect.objectContaining({ action: "manual_move", fromStatus: "ai_idea", toStatus: "script" }),
  );
});

it("stores rejected idea snapshot before deleting an ai_idea reel", async () => {
  const result = await deleteReel(supabase, userId, reelId);
  expect(repository.saveRejectedIdeaSnapshot).toHaveBeenCalledWith(
    supabase,
    expect.objectContaining({ reelId, origin: "ai_idea_generation" }),
  );
  expect(result).toMatchObject({ success: true, reelId });
});

it("clears published_at when leaving published", async () => {
  await updateReelStatus(supabase, userId, reelId, { status: "ready" });
  expect(repository.updateReelById).toHaveBeenCalledWith(
    supabase,
    userId,
    reelId,
    expect.objectContaining({ status: "ready", published_at: null }),
  );
});
```

- [x] **Step 2: Run the board service tests to verify the rules are currently missing**

Run: `npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-board-route.handlers.test.ts`
Expected: FAIL on invalid transition handling, rejected snapshot persistence, and `published_at` updates.

- [x] **Step 3: Add repository helpers and service logic for origin-aware deletes and status transitions**

```ts
if (input.status === "ai_idea") {
  return {
    success: false,
    error: "INVALID_STATUS_TRANSITION",
    message: "Only Reel Idea Generation may place reels in ai_idea",
  };
}

if ("origin" in input) {
  return {
    success: false,
    error: "IMMUTABLE_FIELD",
    message: "origin cannot be changed",
  };
}

if (current.status === "ai_idea") {
  await insertTransitionEvent(supabase, {
    userId,
    reelId: current.id,
    fromStatus: "ai_idea",
    toStatus: input.status,
    action: "manual_move",
    metadata: { origin: current.origin },
  });
}

const nextPatch: ReelUpdate = {
  status: input.status,
  published_at:
    current.status !== "published" && input.status === "published"
      ? nowIso
      : current.status === "published" && input.status !== "published"
        ? null
        : current.published_at,
};

if (current.status === "ai_idea") {
  await saveRejectedIdeaSnapshot(supabase, {
    userId,
    reelId: current.id,
    runId: current.last_run_id ?? null,
    origin: current.origin,
    idea: current.idea,
    title: current.title,
    caption: current.caption,
    body: current.body,
    hashtags: current.hashtags,
    notes: current.notes,
  });
}
```

- [x] **Step 4: Tighten request validation and route responses around the new error case**

```ts
function toServiceErrorResponse(result: { error: string; message: string }) {
  const status =
    result.error === "NOT_FOUND"
      ? 404
      : result.error === "INVALID_STATUS_TRANSITION"
        ? 400
        : 500;

  return jsonError(status, {
    error: result.error,
    message: result.message,
  });
}
```

- [x] **Step 5: Re-run the board service and route tests**

Run: `npm run test -- app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-board-route.handlers.test.ts`
Expected: PASS.

- [x] **Step 6: Commit the reel domain rule changes**

```bash
git add app/_features/academy/reels/server/reel-board.repository.ts app/_features/academy/reels/server/reel-board.service.ts app/_features/academy/reels/server/reel-board-route.schemas.ts app/_features/academy/reels/server/reel-board-route.handlers.ts app/api/academy/reels/[reelId]/route.ts app/api/academy/reels/[reelId]/status/route.ts app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-board-route.handlers.test.ts
git commit -m "feat: add ai idea board domain rules"
```

### Task 4: Build the Reel Idea Generation service, prompt, repository, and manual trigger API

**Files:**
- Create: `app/_features/academy/reels/server/reel-idea-generation.repository.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.prompt.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation.service.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation-route.schemas.ts`
- Create: `app/_features/academy/reels/server/reel-idea-generation-route.handlers.ts`
- Create: `app/api/academy/reels/idea-generation/route.ts`
- Modify: `app/_features/academy/reels/server/reel-generation.repository.ts`
- Modify: `app/_features/academy/reels/server/reel-generation.service.ts`
- Modify: `app/_features/academy/reels/index.ts`
- Test: `app/_features/academy/reels/server/reel-idea-generation.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts`
- Test: `app/_features/academy/reels/server/reel-generation.service.test.ts`

- [x] **Step 1: Write failing tests for prompt inputs, partial success, manual triggering, and active-run blocking**

```ts
it("builds a separated prompt from user context, published reels, memories, and rejected ideas", async () => {
  const result = await runReelIdeaGeneration(supabase, {
    userId: "user-1",
    trigger: "manual",
    slot: null,
  });

  expect(llm.generateReelIdeaGenerationObject).toHaveBeenCalledWith(
    expect.objectContaining({
      ideasPerRun: 3,
      systemContext: null,
      latestPublishedReels: expect.arrayContaining([
        expect.objectContaining({ idea: "Published idea" }),
      ]),
      semanticMemories: expect.any(Array),
      episodicMemories: expect.any(Array),
      rejectedIdeas: expect.any(Array),
    }),
  );
  expect(repository.listRecentSemanticMemories).toHaveBeenCalledWith(supabase, "user-1", 5);
  expect(repository.listRecentEpisodicMemories).toHaveBeenCalledWith(supabase, "user-1", 5);
  expect(repository.listRecentRejectedIdeas).toHaveBeenCalledWith(supabase, "user-1", 10);
});

it("saves partial idea batches and records partial metadata", async () => {
  llm.generateReelIdeaGenerationObject.mockResolvedValue({
    ideas: [{ idea: "Idea A" }, { idea: "Idea B" }],
    rawText: "raw",
  });

  const result = await runReelIdeaGeneration(supabase, {
    userId: "user-1",
    trigger: "scheduled",
    slot: "2026-05-19T09:00:00.000Z",
  });

  expect(result.createdCount).toBe(2);
  expect(logRepository.insertRunLog).toHaveBeenCalledWith(
    supabase,
    expect.objectContaining({
      metadata: expect.objectContaining({ partial: true, requestedCount: 3, createdCount: 2 }),
    }),
  );
});

it("rejects a manual trigger when the same flow already has an active run", async () => {
  runRepository.hasActiveFlowRun.mockResolvedValue(true);

  const result = await triggerManualReelIdeaGeneration(supabase, { userId: "user-1" });

  expect(result).toEqual({
    success: false,
    error: "FLOW_ALREADY_RUNNING",
    message: "Idea generation already running",
  });
});

it("allows manual idea generation even when automatic scheduling is disabled", async () => {
  settingsRepository.getGenerationSettingsByUser.mockResolvedValue({
    data: {
      user_id: "user-1",
      config: {
        reelIdeaGeneration: {
          enabled: false,
          runTimes: ["09:00"],
          ideasPerRun: 3,
          maxPendingAiIdeas: 10,
          latestPublishedReelsCount: 3,
          ideaGenerationContext: null,
        },
      },
    },
    error: null,
  });

  const result = await triggerManualReelIdeaGeneration(supabase, { userId: "user-1" });
  expect(result).toMatchObject({ success: true });
});
```

- [x] **Step 2: Run the new service and handler tests to verify the flow does not exist yet**

Run: `npm run test -- app/_features/academy/reels/server/reel-idea-generation.service.test.ts app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts app/_features/academy/reels/server/reel-generation.service.test.ts`
Expected: FAIL with missing files or exports.

- [x] **Step 3: Implement repository reads and prompt builder with explicit sections**

```ts
const SEMANTIC_MEMORY_CONTEXT_LIMIT = 5;
const EPISODIC_MEMORY_CONTEXT_LIMIT = 5;
const REJECTED_IDEA_CONTEXT_LIMIT = 10;

export async function listLatestPublishedReels(
  supabase: ReelSupabaseClient,
  userId: string,
  limit: number,
) {
  return supabase
    .from("academy_reels")
    .select("idea, title, caption, body, hashtags, notes, published_at, origin")
    .eq("user_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
}

export function buildReelIdeaGenerationPrompt(input: BuildReelIdeaGenerationPromptInput) {
  return {
    system: input.ideaGenerationContext?.trim() ?? null,
    user: [
      formatPublishedSection(input.latestPublishedReels),
      formatSemanticMemoriesSection(input.semanticMemories),
      formatEpisodicMemoriesSection(input.episodicMemories),
      formatRejectedIdeasSection(input.rejectedIdeas),
      `Generate ${input.ideasPerRun} clearly distinct reel ideas.`,
    ].join("\n\n"),
  };
}
```

- [x] **Step 4: Implement the service and manual route using one model call per run**

```ts
const activeRun = await hasActiveFlowRun(supabase, { userId, flow: "reel_idea_generation" });
if (activeRun) {
  return { success: false, error: "FLOW_ALREADY_RUNNING", message: "Idea generation already running" };
}

const availableSlots = Math.max(0, settings.reelIdeaGeneration.maxPendingAiIdeas - pendingAiIdeaCount);
const requestedCount = Math.min(settings.reelIdeaGeneration.ideasPerRun, availableSlots);

if (requestedCount === 0) {
  return { success: true, createdCount: 0, requestedCount: 0, noOpReason: "ai_idea backlog limit reached" };
}

const generated = await generateReelIdeaGenerationObject({
  prompt,
  ideasPerRun: requestedCount,
});

const validIdeas = generated.ideas.filter((row) => row.idea.trim().length > 0);
await insertGeneratedAiIdeas(
  supabase,
  validIdeas.map((row) => ({
    user_id: userId,
    status: "ai_idea",
    generation_status: "not_generated",
    origin: "ai_idea_generation",
    idea: row.idea,
    notes: null,
    last_idea_generation_run_id: runId,
  })),
);
```

- [x] **Step 5: Re-run the new service and route tests**

Run: `npm run test -- app/_features/academy/reels/server/reel-idea-generation.service.test.ts app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts app/_features/academy/reels/server/reel-generation.service.test.ts`
Expected: PASS.

- [x] **Step 6: Commit the idea generation backend flow**

```bash
git add app/_features/academy/reels/server/reel-idea-generation.repository.ts app/_features/academy/reels/server/reel-idea-generation.prompt.ts app/_features/academy/reels/server/reel-idea-generation.service.ts app/_features/academy/reels/server/reel-idea-generation-route.schemas.ts app/_features/academy/reels/server/reel-idea-generation-route.handlers.ts app/api/academy/reels/idea-generation/route.ts app/_features/academy/reels/server/reel-generation.repository.ts app/_features/academy/reels/server/reel-generation.service.ts app/_features/academy/reels/index.ts app/_features/academy/reels/server/reel-idea-generation.service.test.ts app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts app/_features/academy/reels/server/reel-generation.service.test.ts
git commit -m "feat: add reel idea generation flow"
```

### Task 5: Refactor settings and worker orchestration around spawned flow runs

**Files:**
- Modify: `app/_features/academy/reels/server/reel-settings.service.ts`
- Modify: `app/_features/academy/reels/server/reel-settings-route.schemas.ts`
- Modify: `app/_features/academy/reels/server/reel-settings-route.handlers.ts`
- Modify: `app/api/academy/reels/settings/route.ts`
- Modify: `app/_features/academy/reels/server/reel-worker.service.ts`
- Create: `app/_features/academy/reels/server/reel-automation-runner.service.ts`
- Create: `scripts/reel-automation-run.ts`
- Modify: `scripts/reels-worker.ts`
- Test: `app/_features/academy/reels/server/reel-settings.service.test.ts`
- Test: `app/_features/academy/reels/server/reel-settings-route.handlers.test.ts`
- Test: `app/_features/academy/reels/server/reel-worker.service.test.ts`

- [x] **Step 1: Write failing tests for nested settings defaults, 10-minute spacing, and run spawning**

```ts
it("returns nested default settings for users with no row", async () => {
  const result = await getReelAutomationSettings(supabase, userId);
  expect(result).toEqual({
    success: true,
    settings: {
      reelScripting: expect.objectContaining({ enabled: false, runTimes: [] }),
      reelIdeaGeneration: expect.objectContaining({
        enabled: false,
        ideasPerRun: 3,
        maxPendingAiIdeas: 10,
        latestPublishedReelsCount: 3,
      }),
    },
  });
});

it("normalizes legacy flat settings rows into the nested shape", async () => {
  repository.getGenerationSettingsByUser.mockResolvedValue({
    data: {
      user_id: userId,
      config: { enabled: true, runTimes: ["08:00"], editorialContext: "legacy" },
    },
    error: null,
  });

  const result = await getReelAutomationSettings(supabase, userId);
  expect(result).toMatchObject({
    success: true,
    settings: {
      reelScripting: { enabled: true, runTimes: ["08:00"], scriptingContext: "legacy" },
      reelIdeaGeneration: expect.objectContaining({ ideasPerRun: 3 }),
    },
  });
});

it("spawns one due run process per user and flow", async () => {
  const result = await processDueAutomationRuns({} as never, deps);
  expect(deps.createAutomationRun).toHaveBeenCalledWith(
    expect.objectContaining({ status: "queued", flow: "reel_idea_generation" }),
  );
  expect(deps.spawnRunProcess).toHaveBeenCalledWith(
    expect.objectContaining({ flow: "reel_idea_generation", userId: "user-1" }),
  );
});

it("marks the spawned run lifecycle from queued to processing to completed", async () => {
  await executeAutomationRunProcess({} as never, { runId: "run-1", flow: "reel_idea_generation", userId: "user-1" }, deps);
  expect(deps.updateAutomationRun).toHaveBeenNthCalledWith(1, expect.anything(), "run-1", expect.objectContaining({ status: "processing" }));
  expect(deps.updateAutomationRun).toHaveBeenLastCalledWith(expect.anything(), "run-1", expect.objectContaining({ status: "completed" }));
});
```

- [x] **Step 2: Run the settings and worker tests to verify the old queue-only worker is insufficient**

Run: `npm run test -- app/_features/academy/reels/server/reel-settings.service.test.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts`
Expected: FAIL on nested defaults, spacing validation, and missing run spawning behavior.

- [x] **Step 3: Implement nested settings defaults and server-side validation**

```ts
const DEFAULT_REEL_AUTOMATION_SETTINGS: ReelAutomationSettings = {
  reelScripting: {
    enabled: false,
    runTimes: [],
    scriptingContext: null,
  },
  reelIdeaGeneration: {
    enabled: false,
    runTimes: [],
    ideasPerRun: 3,
    maxPendingAiIdeas: 10,
    latestPublishedReelsCount: 3,
    ideaGenerationContext: null,
  },
};

function normalizeLegacySettings(config: unknown): ReelAutomationSettings {
  if (isLegacyFlatSettings(config)) {
    return {
      reelScripting: {
        enabled: config.enabled ?? false,
        runTimes: normalizeRunTimes(config.runTimes),
        scriptingContext: normalizeNullableText(config.editorialContext),
      },
      reelIdeaGeneration: DEFAULT_REEL_AUTOMATION_SETTINGS.reelIdeaGeneration,
    };
  }

  return reelAutomationSettingsSchema.parse(config ?? DEFAULT_REEL_AUTOMATION_SETTINGS);
}

function assertMinimumRunSpacing(times: string[]) {
  const sorted = [...times].sort();
  for (let index = 1; index < sorted.length; index += 1) {
    if (differenceInMinutes(sorted[index - 1], sorted[index]) < 10) {
      throw new Error("All run times must be at least 10 minutes apart.");
    }
  }
}
```

- [x] **Step 4: Implement run discovery, locking, and spawned-process orchestration**

```ts
const dueRuns = await listDueAutomationRuns(supabase, now);
for (const run of dueRuns) {
  const createdRun = await createAutomationRun(supabase, {
    userId: run.userId,
    flow: run.flow,
    trigger: run.trigger,
    slot: run.slot,
    status: "queued",
    metadata: {},
  });
  const lock = await acquireFlowRunLock(supabase, {
    userId: run.userId,
    flow: run.flow,
  });

  if (!lock.acquired) continue;

  const spawned = await spawnRunProcess({
    runId: createdRun.id,
    userId: run.userId,
    flow: run.flow,
    trigger: run.trigger,
    slot: run.slot,
  });

  if (!spawned.success) {
    await markRunSpawnFailure(supabase, { runId: createdRun.id, message: spawned.message });
  }
}

// Inside the child process entrypoint:
await updateAutomationRun(supabase, runId, { status: "processing", started_at: nowIso });
const result = await runFlowForProcess(input);
await updateAutomationRun(supabase, runId, {
  status: result.success ? "completed" : "failed",
  completed_at: doneIso,
  metadata: result.metadata,
});
```

- [x] **Step 5: Re-run the settings and worker tests**

Run: `npm run test -- app/_features/academy/reels/server/reel-settings.service.test.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts`
Expected: PASS.

- [x] **Step 6: Commit the settings and orchestration refactor**

```bash
git add app/_features/academy/reels/server/reel-settings.service.ts app/_features/academy/reels/server/reel-settings-route.schemas.ts app/_features/academy/reels/server/reel-settings-route.handlers.ts app/api/academy/reels/settings/route.ts app/_features/academy/reels/server/reel-worker.service.ts app/_features/academy/reels/server/reel-automation-runner.service.ts scripts/reel-automation-run.ts scripts/reels-worker.ts app/_features/academy/reels/server/reel-settings.service.test.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts
git commit -m "feat: orchestrate reel automation per spawned run"
```

### Task 6: Add AI idea board UI, manual trigger, approve action, and settings page UX

**Files:**
- Modify: `app/design/organisms/settings/ReelAutomationSettingsPanel.tsx`
- Modify: `app/(app-shell)/academy/automation/page.tsx`
- Modify: `app/design/templates/academy/useReelBoardWorkspace.ts`
- Modify: `app/design/organisms/academy/ReelKanbanBoard.tsx`
- Modify: `app/design/organisms/academy/ReelKanbanColumn.tsx`
- Modify: `app/design/organisms/academy/ReelEditDrawer.tsx`
- Modify: `app/design/organisms/academy/ReelCard.tsx`
- Test: `app/design/academy-ui.test.tsx`
- Test: `app/design/auth-ui.test.tsx`
- Test: `app/design/organisms/academy/ReelCard.test.tsx`

- [x] **Step 1: Write failing UI tests for the new column, manual trigger, settings cards, 10-minute validation, and approve action**

```tsx
it("renders the AI idea column with a manual generation trigger", () => {
  render(<ReelKanbanBoard workspace={workspace} />);
  expect(screen.getByText("AI Idea")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /generate ai ideas/i })).toBeInTheDocument();
});

it("shows a clear error when manual idea generation is already running", async () => {
  workspace.triggerManualIdeaGeneration = vi.fn().mockResolvedValue({
    success: false,
    error: "FLOW_ALREADY_RUNNING",
    errorMessage: "Idea generation already running",
  });

  render(<ReelKanbanBoard workspace={workspace} />);
  await user.click(screen.getByRole("button", { name: /generate ai ideas/i }));
  expect(await screen.findByText("Idea generation already running")).toBeInTheDocument();
});

it("shows separate settings cards for scripting and idea generation with one save button", async () => {
  render(<ReelAutomationSettingsPanel />);
  expect(screen.getByText("Reel scripting")).toBeInTheDocument();
  expect(screen.getByText("Reel idea generation")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save reel automation/i })).toBeInTheDocument();
});

it("shows a 10-minute validation error for idea generation run times in the form", async () => {
  render(<ReelAutomationSettingsPanel />);
  await user.type(screen.getByLabelText(/idea generation run times/i), "09:00, 09:05");
  await user.click(screen.getByRole("button", { name: /save reel automation/i }));
  expect(await screen.findByText(/all run times must be at least 10 minutes apart/i)).toBeInTheDocument();
});

it("does not allow clearing required idea generation numeric settings", async () => {
  render(<ReelAutomationSettingsPanel />);
  const ideasPerRun = screen.getByLabelText(/ideas per run/i);
  await user.clear(ideasPerRun);
  expect(ideasPerRun).toHaveValue(3);
});

it("shows approve only for ai_idea reels", () => {
  render(<ReelEditDrawer reel={aiIdeaReel} open onClose={vi.fn()} onSave={vi.fn()} />);
  expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
});
```

- [x] **Step 2: Run the UI tests to verify the current UI does not expose the new flow**

Run: `npm run test -- app/design/academy-ui.test.tsx app/design/auth-ui.test.tsx app/design/organisms/academy/ReelCard.test.tsx`
Expected: FAIL because `AI idea`, `Approve`, and nested settings sections are missing.

- [x] **Step 3: Update the workspace state and board rendering for the `ai_idea` column and manual trigger**

```ts
const columns = {
  ai_idea: sortColumn(board.columns.ai_idea),
  idea: sortColumn(board.columns.idea),
  script: sortColumn(board.columns.script),
  to_record: sortColumn(board.columns.to_record),
  to_edit: sortColumn(board.columns.to_edit),
  ready: sortColumn(board.columns.ready),
  published: sortColumn(board.columns.published),
};

async function triggerManualIdeaGeneration() {
  setIsGeneratingIdeas(true);
  const result = await runManualIdeaGeneration();
  setIsGeneratingIdeas(false);
  if (!result.success) {
    setErrorMessage(result.errorMessage);
    return;
  }

  startTransition(() => {
    setBoard((currentBoard) => normalizeBoard(result.board ?? currentBoard));
  });
}
```

- [x] **Step 4: Update the drawer and settings panel interactions**

```tsx
{reel.status === "ai_idea" ? (
  <Button type="button" onClick={() => void onApprove(draft)} disabled={busy}>
    Approve
  </Button>
) : null}

// onApprove must call save + status transition + transition-event logging in one server-backed action path

<Button type="button" onClick={() => void saveAllSettings()} disabled={isSaving}>
  Save reel automation
</Button>

<Field
  aria-label="Ideas per run"
  type="number"
  min={1}
  value={String(settings.reelIdeaGeneration.ideasPerRun)}
  onChange={handleIdeasPerRunChange}
  onBlur={restoreDefaultIfCleared}
/>
```

- [x] **Step 5: Re-run the UI tests**

Run: `npm run test -- app/design/academy-ui.test.tsx app/design/auth-ui.test.tsx app/design/organisms/academy/ReelCard.test.tsx`
Expected: PASS.

- [x] **Step 6: Commit the UI surface**

```bash
git add app/design/organisms/settings/ReelAutomationSettingsPanel.tsx app/(app-shell)/academy/automation/page.tsx app/design/templates/academy/useReelBoardWorkspace.ts app/design/organisms/academy/ReelKanbanBoard.tsx app/design/organisms/academy/ReelKanbanColumn.tsx app/design/organisms/academy/ReelEditDrawer.tsx app/design/organisms/academy/ReelCard.tsx app/design/academy-ui.test.tsx app/design/auth-ui.test.tsx app/design/organisms/academy/ReelCard.test.tsx
git commit -m "feat: add ai idea board and settings ui"
```

### Task 7: Update docs and run final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/academy-reel-agent-v1-architecture.md`
- Modify: `docs/superpowers/specs/2026-05-15-reel-idea-generation-design.md`
- Modify: `docs/adr/0001-reel-automation-run-process-model.md`

- [x] **Step 1: Write failing documentation checklist assertions in the plan review notes**

```md
- README must mention `ai_idea`, manual AI idea generation, and the updated worker model.
- `docs/academy-reel-agent-v1-architecture.md` must describe both flows and spawned run processes.
- `docs/adr/0001-reel-automation-run-process-model.md` must stay aligned with the final spawned-run implementation.
- The design spec must reflect implementation deltas discovered during coding.
```

- [x] **Step 2: Update the docs to match the shipped behavior**

```md
- Add `ai_idea` to the reel status list in `README.md`
- Document the manual trigger in the AI idea column header
- Document that the worker discovers due runs and spawns one process per flow run
```

- [x] **Step 3: Run focused verification first**

Run: `npm run test -- app/_features/academy/reels/lib/reel-board-client.test.ts app/_features/academy/reels/lib/reel-settings-client.test.ts app/_features/academy/reels/server/reel-board.service.test.ts app/_features/academy/reels/server/reel-board-route.handlers.test.ts app/_features/academy/reels/server/reel-idea-generation.service.test.ts app/_features/academy/reels/server/reel-idea-generation-route.handlers.test.ts app/_features/academy/reels/server/reel-settings.service.test.ts app/_features/academy/reels/server/reel-settings-route.handlers.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts app/design/academy-ui.test.tsx app/design/auth-ui.test.tsx app/design/organisms/academy/ReelCard.test.tsx`
Expected: PASS.

- [x] **Step 4: Run repo-level quality gates required by AGENTS.md**

Run: `npm run lint && npm run typecheck`
Expected: both commands PASS.

- [x] **Step 5: Push the feature branch and open the PR required by AGENTS.md**

```bash
git push -u origin codex/reel-idea-generation-ai-idea-flow
gh pr create --draft --title "feat: add reel idea generation ai idea flow" --body-file .github/pull_request_template.md
```

- [x] **Step 6: Commit docs and verification-ready changes**

```bash
git add README.md docs/academy-reel-agent-v1-architecture.md docs/superpowers/specs/2026-05-15-reel-idea-generation-design.md docs/adr/0001-reel-automation-run-process-model.md
git commit -m "docs: describe reel idea generation flow"
```

## Plan Review Checklist

- `Reel Idea Generation` creates only `idea`, in status `ai_idea`, with `origin = ai_idea_generation` and `generation_status = not_generated`
- `Reel Scripting` remains focused on reels already in `idea`
- `ai_idea` is AI-ingress only; users may move out but never into it
- Manual trigger exists in the `AI idea` column header and works even if automatic scheduling is disabled
- Settings remain one record per user with nested sections for both flows
- Same-flow run times validate minimum 10-minute spacing in UI and server
- Rejected `ai_idea` reels are snapshotted into `academy_reel_rejected_ideas` before hard delete
- Published context uses current `status = published` plus `published_at desc`
- Scheduler discovers due runs and spawns one process per due run
- Only one run per user per flow may execute at once
