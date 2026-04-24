# Agent Instructions - Jarvis AI

This file defines stable working rules for every task in this project.

## Purpose

Keep implementation quality high while protecting scope, architecture boundaries, and delivery speed.

## Project Context

Jarvis AI is a Next.js app for a real-time voice assistant powered by Google Gemini Live API.
The app supports wake word activation, live voice chat, tool calling
(calendar/tasks/timer/memory), chat persistence, and Google/Supabase auth + storage.

## Working Rules

- Keep every change small, focused, and strictly in scope; do not perform unrelated refactors.
- Keep changes aligned with `README.md` and `Description.md`.
- When a change affects behavior, data structures, or important flows, update relevant docs.
- For checklist plans, mark each implemented step as completed (`- [x]`) right after implementation.
- Respect existing boundaries: domain logic in `app/_features`, shared primitives in `app/_shared`,
  server-only code in `app/_server`, and thin App Router/API entrypoints.

## Product Priorities

## Tooling Rules

- Use the Supabase MCP tool for Supabase work (schema, SQL, migrations, logs, project ops).
- Prefer tracked migrations for structural database changes over manual unversioned updates.

## GitHub Rules

- Default GitHub repository: `CodingMyke/jarvis_ts`.
- Do not use git worktrees for implementation tasks.
- Use only branches for implementation work.
- For GitHub issue work, use GitHub MCP tools first.
- Read issues by searching open issues with keyword + scope, then open the exact issue number.
- For every issue, create and use a dedicated branch before starting implementation.
- Branch names for issue work must clearly match the issue title purpose.
- At the end of implementation, push the branch and open a Pull Request automatically.
- Do not merge Pull Requests unless the user explicitly asks for merge.
- Merge is user-owned by default (manual merge or explicit user instruction to the AI).
- Keep implementation plans/checklists until the PR is merged; remove/archive them only after merge is confirmed.
- When creating an issue, write a short title, clear problem, expected behavior, and simple acceptance points.
- Close an issue only after user confirmation or merged fix. Add a short closing note with linked PR/commit.

## Language Rules

- All code, comments, commit messages, and documentation must be written in English.
- When speaking with the user, always communicate in Italian.
- Keep user replies and documentation very short.
- Prefer brevity over perfect grammar.

## Source Of Truth

- `AGENTS.md`: execution rules, workflow rules, coding standards, and delivery process.
- `README.md`: product overview, setup steps, architecture map, and operational usage.
- `Description.md`: deep technical specification for chat memory and conversation compaction.
- Conflict resolution:
  - Follow direct user instructions first.
  - For workflow/process conflicts, `AGENTS.md` wins.
  - For chat memory/compaction behavior conflicts, `Description.md` wins.
  - For general product context/setup conflicts outside compaction scope, `README.md` wins.
- Update policy:
  - Update `Description.md` when memory/compaction behavior changes.
  - Update `README.md` when setup, usage, or architecture map changes.
  - Update `AGENTS.md` only when execution rules/process standards change.

## Technical Architecture Specs

- Prefer a single source of truth for shared state, business rules, and config
  when scope is truly shared.
- Design deep modules with clear cohesion and strict boundaries.
- Optimize for clarity, maintainability, and efficiency over clever abstractions.
- Define explicit module ownership and responsibilities.
  Each module must have one clear purpose.
- Expose minimal public APIs.
  Keep implementation details private.
- Keep dependency direction one-way between modules.
  Do not introduce circular dependencies.
- Reduce duplicated logic and data only when this improves clarity and maintainability.
- Share contracts (types/schemas) only for related entities and related features.
- For unrelated features, keep autonomy first.
  Do not force shared contracts across unrelated domains, even when shapes match.
  In those cases, duplication is preferred.
- Use one consistent error-handling strategy across modules.
  Errors must be predictable and traceable.

## Coding Standards

### TypeScript/React Development

- Use TypeScript 5 with strict mode.
- Lint with ESLint (`npm run lint`).
- Type check with TypeScript (`npm run typecheck`).
- Test with Vitest (`npm run test`).
- Prefer explicit type annotations for exported functions and public interfaces.
- Use JSDoc comments for public APIs and non-obvious modules.
- Max line length: target 100; never exceed 120 characters.


### Naming Conventions

- Functions/variables: camelCase.
- Components: PascalCase.
- Types/Interfaces: PascalCase.
- Constants: UPPER_SNAKE_CASE.
- Files: `PascalCase.tsx` for React components, kebab-case or domain-suffixed `.ts` for services,
  schemas, providers, and route helpers.

## Verification

- Always verify work with tests when available.
- Run lint after changes (`npm run lint`).
- Run typecheck after significant changes (`npm run typecheck`).
- Run Vitest when touching validators, state machines, tools, or server logic (`npm run test`).
- Test UI/audio/auth flows in browser when applicable.

## Error Handling

- Handle errors with a consistent strategy across modules (stable error code + clear message + context).
- Use try-catch at boundaries (route handlers, server actions, provider calls, DB/network I/O), not everywhere.
- Reuse shared HTTP helpers such as `jsonOk()` and `jsonError()` where already used.
- Centralize logging behavior and keep logs structured enough to trace feature, operation, and root cause.
- Do not silently ignore exceptions unless the feature has explicit fallback behavior.

## Data Validation

- Always validate input with Zod schemas.
- Validate query params and request bodies at route boundaries when needed.
- Keep schemas close to the related feature (`*-route.schemas.ts`).
- Sanitize and trim external/user input before persistence or provider calls.
