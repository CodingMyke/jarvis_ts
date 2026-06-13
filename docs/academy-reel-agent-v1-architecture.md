# Academy Reel Agent v1 - High-Level Architecture

## Purpose

This document captures the implemented high-level design for Academy Reel generation v1.

## Goals

- Implement manual and scheduled-ready reel AI generation on top of the existing Academy board.
- Keep orchestration server-only and typed.
- Persist queue and run logs in Supabase for traceability.

## Core Principles

- Strong typing at compile time (TypeScript generics).
- Runtime validation at boundaries (Zod).
- Strict separation of concerns:
  - Agent core does not know DB details.
  - Domain modules own business rules and persistence.
  - Async orchestration is externalized to a local worker.
- Minimal, scalable v1 scope.

## Agreed End-to-End Flow (v1)

1. User opens Academy Reel page and creates/edits a reel.
2. User triggers generation globally or for a single field.
3. API validates input and enqueues one job in `academy_reel_generation_queue_jobs`.
4. Local worker (`npm run reels:worker`) claims pending jobs.
5. Worker calls one generation service that builds prompt + dynamic Zod output schema.
6. Service calls OpenAI (`gpt-4o`) via Vercel AI SDK `generateObject`.
7. Service updates reel fields and `generation_status`, then writes run logs.
8. Drawer actions stay disabled while `generation_status = processing`.

## Agent Output Contract (v1)

The generated payload is strictly structured as:

- `title`
- `caption`
- `body`
- `hashtags`

Notes:
- Hook/beats and similar structure are embedded inside `body`.
- Input idea is stored in the same record together with generated output.

## Job and Async Strategy

- Async execution is handled by a local polling worker script.
- Trigger model:
  - API request creates queue jobs.
  - Worker processes one job at a time and writes run logs.

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

### 3) Async Orchestration (Local Worker)

Responsibilities:
- Claim queued jobs.
- Invoke generation workflow.
- Drive status transitions (`processing` -> `completed`/`failed`).

Non-responsibilities:
- No heavy domain rule ownership beyond orchestration.

## Tooling Model (Agreed)

- Tools are a typed named map (not an anonymous array).
- Each agent declares and receives only its allowed tools.
- Tools own side effects (e.g., DB updates), not the agent core.

## UI/UX Scope for v1

Statuses:
- `not_generated`
- `processing`
- `completed`
- `failed`

Actions:
- `generate all` in drawer header
- `generate title/caption/body/hashtags`
- settings panel in `/settings` for automation config

Rules:
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

The v1 implementation ships:
- DB-backed queue + logs + per-user settings,
- manual generation APIs and UI controls,
- local worker orchestration,
- typed contracts + route validation.
