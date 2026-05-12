# Academy Reel Agent v1 - High-Level Architecture

## Purpose

This document captures the agreed high-level design for the first implementation of the Academy Reel generation flow. It is intended as a planning baseline before detailed technical design and coding.

## Goals

- Build a reusable, deep-module agent core that is independent from domain-specific logic.
- Implement the first domain use case: Academy -> Reel idea generation.
- Keep the first release intentionally small while preserving a clean architecture for future agents.

## Core Principles

- Strong typing at compile time (TypeScript generics).
- Runtime validation at boundaries (Zod).
- Strict separation of concerns:
  - Agent core does not know DB details.
  - Domain modules own business rules and persistence.
  - Async orchestration is externalized to a job runner.
- Minimal, scalable v1 scope.

## Agreed End-to-End Flow (v1)

1. User opens Academy Reel page and submits an idea.
2. System immediately creates one reel record with status `processing`.
3. UI applies optimistic update and shows the new item instantly.
4. System emits an async job event (Inngest).
5. Inngest runs one Reel generator agent in background.
6. Agent executes with typed named tools only.
7. Tool updates the same reel record with generated output.
8. Record becomes `completed` or `failed`.
9. Frontend polls every 3 seconds while status is `processing`.

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

- Async execution is handled with Inngest (not Vercel cron-based worker loops).
- Trigger model:
  - API request creates data + emits event.
  - Inngest function processes work asynchronously.
- This avoids long user-facing HTTP requests and improves reliability.

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

### 3) Async Orchestration (Inngest)

Responsibilities:
- Receive domain event.
- Invoke agent workflow.
- Drive status transitions (`processing` -> `completed`/`failed`).

Non-responsibilities:
- No heavy domain rule ownership beyond orchestration.

## Tooling Model (Agreed)

- Tools are a typed named map (not an anonymous array).
- Each agent declares and receives only its allowed tools.
- Tools own side effects (e.g., DB updates), not the agent core.

## UI/UX Scope for v1

Statuses:
- `processing`
- `completed`
- `failed`

Actions:
- `retry` when `failed`
- `edit` after `completed`

Rules:
- Editing is blocked while `processing`.
- Retry reuses the same record (no clone/new record).

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

## Open Technical Planning Items

These items are intentionally deferred to implementation planning:

- Exact DB schema fields and constraints.
- Exact event naming and payload schema.
- Error taxonomy and retry backoff policies.
- Observability detail level (logs/metrics/tracing).
- API contract details and route-level validation shapes.

## Summary

The v1 design balances delivery speed and architecture quality:
- immediate user feedback,
- async durable generation,
- deep module separation,
- strict typing + runtime safety,
- and a clean path to scale with additional agents.
