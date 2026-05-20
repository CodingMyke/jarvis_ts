# Academy Reel Agent v1 - High-Level Architecture

## Purpose

This document captures the implemented high-level design for Academy Reel automation with
`Reel Scripting` and `Reel Idea Generation`.

## Goals

- Implement manual and scheduled-ready reel AI generation on top of the existing Academy board.
- Keep orchestration server-only and typed.
- Persist run logs and AI-idea provenance in Supabase for traceability.

## Core Principles

- Strong typing at compile time (TypeScript generics).
- Runtime validation at boundaries (Zod).
- Strict separation of concerns:
  - Agent core does not know DB details.
  - Domain modules own business rules and persistence.
  - Async orchestration is externalized to a local worker.
- Minimal, scalable v1 scope.

## Agreed End-to-End Flow

1. User opens Academy Reel page and creates/edits a reel.
2. User either:
   - triggers scripting generation globally or for a single field from the drawer, or
   - triggers `Reel Idea Generation` from the `AI idea` column header, or
   - relies on scheduled automation.
3. API validates input and delegates to feature services.
4. The local worker (`npm run reels:worker`) discovers due flow runs per user and spawns one child process per due run.
5. The child process executes either `Reel Scripting` or `Reel Idea Generation`.
6. `Reel Idea Generation` builds one prompt from latest published reels, recent memories, optional user context, and rejected idea snapshots, then creates new reels in `ai_idea`.
7. `Reel Scripting` processes current reels in `idea`, generates only missing fields, and moves fully completed reels to `script`.
8. Services update reels, transition events, rejected snapshots, and automation run metadata.

## Agent Output Contract (v1)

The generated payload is strictly structured as:

- `title`
- `caption`
- `body`
- `hashtags`

Notes:
- Hook/beats and similar structure are embedded inside `body`.
- Input idea is stored in the same record together with generated output.

## Async Strategy

- Async execution is handled by a local polling worker script plus one spawned child process per due run.
- Trigger model:
  - manual drawer actions execute immediately;
  - scheduled discovery creates `academy_reel_automation_runs` rows;
  - the worker spawns `scripts/reel-automation-run.ts` with `runId`, `userId`, `flow`, `trigger`, and `slot`;
  - the child process owns `queued -> processing -> completed/failed`.

## Module Boundaries

### 1) Generic Agent Core (`app/_features/agents`)

Responsibilities:
- Agent definition contracts.
- Generic execution pipeline.
- Typed tool invocation model.
- Runtime validation of input/output.

Non-responsibilities:
- No Supabase table logic.
- No Academy/Reel business logic.

### 2) Reel Domain Module (`app/_features/academy/reels`)

Responsibilities:
- Reel-specific input and business rules.
- Reel persistence orchestration.
- Concrete typed tools used by the Reel agent.
- UI state model and actions for Reel pages.

### 3) Async Orchestration (Local Worker + Child Runner)

Responsibilities:
- Discover due runs for both automation flows.
- Enforce single-flow-per-user locking through run-state checks.
- Spawn one child process per due run.
- Drive run status transitions (`queued` -> `processing` -> `completed`/`failed`).

Non-responsibilities:
- No heavy domain rule ownership beyond orchestration.

## Tooling Model (Agreed)

- Tools are a typed named map (not an anonymous array).
- Each agent declares and receives only its allowed tools.
- Tools own side effects (e.g., DB updates), not the agent core.

## UI/UX Scope

Statuses:
- `not_generated`
- `processing`
- `completed`
- `failed`

Actions:
- `Generate AI ideas` in the `AI idea` column header
- `Approve` in the drawer for `ai_idea` reels
- `generate all` in drawer header
- `generate title/caption/body/hashtags`
- automation settings page in `/academy/automation`

Rules:
- `Approve` saves pending edits and moves the reel through one dedicated server-backed action path.
- Generation actions are blocked while `processing`.
- Global generation only targets missing fields.
- Field generation only targets the selected field.

## Prompt Governance

- No prompt versioning requirement for v1.

## Scaling Direction (Post-v1)

- Keep one-agent Reel flow for v1.
- Future agents should be added as separate bounded contexts that reuse the same core.
- Avoid one monolithic cross-domain tool module.

## Non-Goals for v1

- Multi-agent pipelines.
- Advanced list filters/sorting and expanded UI states.
- Prompt versioning/audit framework.

## Summary

The implementation ships:
- `ai_idea` as a first-class board status with immutable `origin`,
- explicit approval vs manual-move transition logging,
- rejected-ai-idea snapshots used as negative prompt context,
- nested per-user automation settings for scripting and idea generation,
- spawned run-process orchestration for scheduled automation,
- typed contracts, route validation, and board/settings UI.
