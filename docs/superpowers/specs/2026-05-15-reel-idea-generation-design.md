# Reel Idea Generation Design

## Goal

Extend reel automation with a second flow, `Reel Idea Generation`, that creates new AI-suggested
reels in a dedicated `ai_idea` status while keeping the existing `Reel Scripting` flow focused on
approved reels in `idea`.

## Product Decision

The reel automation system now has two distinct flows:

- `Reel Scripting`
- `Reel Idea Generation`

They share the same scheduler family and worker entrypoint, but they are different flows with
different inputs, outputs, and eligibility rules.

`Reel Scripting` keeps its current role:

- it processes reels already in `idea`;
- it generates only missing fields;
- it moves a reel from `idea` to `script` when all required fields are complete.

`Reel Idea Generation` is a new flow:

- it creates new reel records;
- it populates only the `idea` field;
- it creates reels in status `ai_idea`;
- it sets `generation_status = not_generated`;
- it sets `origin = ai_idea_generation`;
- it leaves `notes` empty.

## Board Model

Add a new reel board status:

- `ai_idea`

Meaning:

- `ai_idea` contains AI-proposed reels that have not yet been validated by the user.

Rules:

- only `Reel Idea Generation` may create or place reels in `ai_idea`;
- users may move reels out of `ai_idea` to any other status;
- users may not move any reel into `ai_idea` manually;
- reels in `ai_idea` remain fully editable through the normal reel editor;
- the `Approve` action is visible only for reels in `ai_idea`;
- `Approve` saves any pending edits and then moves the reel to `idea` through one dedicated
  server-backed action path.

Manual drag and drop from `ai_idea` to `idea` is also allowed. It is semantically similar to
approval at the board level, but logs should distinguish explicit `Approve` from manual move.

## Reel Origin

Every reel must have a non-null origin.

Initial values:

- `manual` for user-created reels;
- `ai_idea_generation` for reels created by `Reel Idea Generation`.

`origin` is immutable after creation.

Published reels used as prompt context are not filtered by origin. If a reel reached `published`,
it is considered part of the real editorial direction regardless of how it started.

## Automation Settings Model

Keep one settings record per user, but store separate config sections inside it.

Logical structure:

- `reelScripting`
  - `enabled`
  - `runTimes`
  - `scriptingContext`
- `reelIdeaGeneration`
  - `enabled`
  - `runTimes`
  - `ideasPerRun`
  - `maxPendingAiIdeas`
  - `latestPublishedReelsCount`
  - `ideaGenerationContext`

The settings page should show two separate cards on the same page, but save the whole page as a
single settings payload.

Settings rules:

- both cards remain editable even when their automatic flow is disabled;
- `enabled` controls only scheduled automation;
- disabling a flow must not erase its saved config;
- `ideaGenerationContext` may be empty;
- numeric/config fields must always have values and must never be user-clearable.

Default `Reel Idea Generation` values:

- `ideasPerRun = 3`
- `maxPendingAiIdeas = 10`
- `latestPublishedReelsCount = 3`
- `ideaGenerationContext = null`

Constraints:

- `latestPublishedReelsCount` is configurable with `min = 1`, `max = 10`, default `3`;
- semantic memory count stays fixed at `5`;
- episodic memory count stays fixed at `5`;
- rejected ideas count stays fixed at `10`;
- within the same flow, all configured run times must be at least `10` minutes apart;
- the time-spacing validation must exist in both UI and server validation.

## Scheduling and Run Model

The system uses these terms:

- `flow`: the type of work, such as `Reel Scripting` or `Reel Idea Generation`
- `run`: one execution of a flow for a specific user and slot
- `job`: an internal queued work unit

`Reel Idea Generation` runs per user and per slot.

For the same user:

- only one run of the same flow may execute at a time;
- a manual run and a scheduled run of the same flow must not overlap;
- different flows may execute at the same time.

If a manual `Reel Idea Generation` run is triggered while another `Reel Idea Generation` run is
already active for that user, the new run is blocked and the UI should show a clear feedback
message.

If the scheduler determines that a run is due, it must not perform the flow work inline. It should
spawn a separate run process for that user and flow.

When a spawned `Reel Idea Generation` process runs, it must reuse the queued run id instead of
creating a second nested run record.

If run process spawning fails:

- mark the run as failed in logs;
- do not retry immediately in the same scheduler tick.

## Manual Trigger

`Reel Idea Generation` also supports a manual run.

UI entrypoint:

- a button in the `AI idea` column header

Manual run rules:

- it uses the same flow logic as scheduled automation;
- it uses the same settings and defaults;
- it respects backlog limits and all validations;
- it works even if automatic `Reel Idea Generation` is disabled;
- only the trigger source changes.

## Prompt Inputs

`Reel Idea Generation` uses four context sources, kept clearly separated in prompt construction:

1. `ideaGenerationContext`
2. latest published reels
3. recent user memories
4. recent rejected ideas

`ideaGenerationContext` is optional and must be passed as separate system-level guidance.

Published reels and memory sections must be formatted explicitly and not merged into one generic
blob.

### Latest published reels

Selection:

- only reels with `status = published`
- ordered by `published_at desc`
- limited by `latestPublishedReelsCount`

Fields to include per reel:

- `idea`
- `title`
- `caption`
- `body`
- `hashtags`
- `notes` if present

If fewer than the configured number exist, use the available published reels.

### Recent memories

Recent memories are support context, not the dominant theme.

Priority order for prompt intent:

1. `ideaGenerationContext`
2. latest published reels
3. recent memories

Memory selection:

- last `5` semantic memories by `created_at desc`
- last `5` episodic memories by `created_at desc`

Fields to include:

- semantic memory: `content`, `key`, `importance`
- episodic memory: `content`, `importance`, `metadata`

The records are passed raw but cleanly formatted. No summarization layer is added in v1.

If no published reels exist, the flow still runs using memories and optional user context.

### Rejected ideas

Recent rejected ideas are negative context for avoiding repeated proposals.

Selection:

- read from `academy_reel_rejected_ideas`
- ordered by `rejected_at desc`
- limited to the last `10`

Include the saved snapshot fields:

- `idea`
- `title`
- `caption`
- `body`
- `hashtags`
- `notes`

They should be passed as a clearly labeled negative section, such as rejected ideas to avoid
repeating.

## Prompt Behavior

`Reel Idea Generation` should ask the model for ideas that are:

- aligned with the recent published direction;
- not repetitive versus recent published reels;
- not repetitive versus recent rejected ideas;
- clearly distinct from each other in the same run.

The run uses one model call per run, not one call per idea.

If the model returns fewer valid ideas than requested:

- save the valid ideas that were returned;
- mark the run as partially successful in metadata;
- do not create any debt or catch-up behavior for future runs.

No extra duplicate-detection layer is required beyond prompt instructions.

## Backlog Rules

`Reel Idea Generation` is limited by a configurable AI backlog cap.

Backlog rules:

- count pending reels in `ai_idea`;
- if the backlog is already at the cap, the run is a valid no-op;
- if only partial space remains, create only the remaining number of ideas up to the cap;
- do not create debt for missed ideas;
- each run behaves independently.

If the flow is enabled but nothing can be created because the AI backlog cap is reached, log a
clear no-op outcome instead of an error.

## Rejected Idea Persistence

Deleting a reel remains a hard delete.

Additional rule for `ai_idea`:

- if a reel is deleted while in `ai_idea`, save a snapshot first in
  `academy_reel_rejected_ideas`, then hard-delete the reel.

This new table is a dedicated dataset for rejected idea context, not just a generic run log.

Rules:

- save each rejection as a separate event;
- no deduplication;
- today only AI-generated ideas will be written there;
- future flows may also write rejected ideas there if needed.

## Published Timestamp Semantics

`published_at` already exists and must follow these rules:

- set it only when a reel enters `published` from a different status;
- clear it when a reel leaves `published`;
- set it again if the reel later re-enters `published`.

This prevents non-published reels from leaking into `Reel Idea Generation` context selection.

## Logging and Traceability

All run logs should include explicit metadata for:

- `flow`
- `runId`
- `trigger`
- `slot`
- `userId`

`Reel Idea Generation` metadata should also capture counts such as:

- requested idea count
- created idea count

Partial success should be recorded in metadata rather than by introducing a new top-level log
status enum.

When multiple reels are created by the same run, they should all be traceable back to the same
`runId`.

## No-op Cases

These are valid no-op outcomes, not failures:

- no published reels but memories/context still allow generation
- no AI backlog space remaining
- no work needed for a scheduled slot

`Reel Idea Generation` should still log these outcomes clearly.

## Summary

`Reel Idea Generation` adds an AI proposal layer before the existing scripting flow.

It creates editable `ai_idea` reels from recent published direction, recent memories, optional user
guidance, and recent rejected ideas, while preserving user review control before a reel becomes a
normal `idea`.
