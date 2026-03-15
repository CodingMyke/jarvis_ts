# Agent Instructions - Jarvis AI

This file provides instructions for AI agents working on the Jarvis AI project. It follows Boris Cherny's recommendations for AI-assisted coding workflows.

## Project Context

Jarvis AI is a Next.js application for a real-time voice assistant powered by Google Gemini Live API. The app supports wake word activation, live voice chat, tool calling for calendar/tasks/timer/memory workflows, chat persistence, and Google/Supabase-based authentication and storage.

## Coding Standards

### TypeScript/React Development
- Use TypeScript 5 with strict mode
- Lint with ESLint (`npm run lint`)
- Type check with TypeScript (`npm run typecheck`)
- Test with Vitest (`npm run test`)
- Prefer explicit type annotations for exported functions and public interfaces
- Use JSDoc comments for public APIs and non-obvious modules
- Max line length 100-120 characters

### React Best Practices
- Use functional components with hooks
- Minimize `useState` and `useEffect` usage
- Separate logic with custom hooks or dedicated managers when it keeps UI components cleaner
- Favor composition over props drilling
- Use Server Components by default, Client Components when needed
- Keep App Router entrypoints thin and import only from `@/app/_features/*`, `@/app/_shared`, or `@/app/_server`
- Respect feature boundaries: application logic in `app/_features`, shared primitives in `app/_shared`, server-only code in `app/_server`

### Naming Conventions
- Functions/variables: camelCase
- Components: PascalCase
- Types/Interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: `PascalCase.tsx` for React components, kebab-case or domain-suffixed `.ts` files for services, schemas, providers, and route helpers

## Git Workflow

Use Conventional Commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks
- `style:` formatting, no code change

Always:
1. Create feature branches from main
2. Run linter and type check before committing
3. Build check for critical changes (`npm run build`)
4. Write clear, concise commit messages

## Workflow Guidelines

### Planning
- Start complex tasks in Plan mode
- Get the plan right before implementing
- Break large tasks into smaller, focused steps
- Consider Server vs Client Component implications
- Preserve the existing thin-route and feature-entrypoint architecture
- All the plans must be stored and founded in `.codex/plans/`

### Verification
- Always verify work with tests when available
- Run linter after making changes (`npm run lint`)
- Type check after significant changes (`npm run typecheck`)
- Run Vitest when touching validators, state machines, tools, or server logic (`npm run test`)
- Test UI/audio/auth flows in browser when applicable

### Error Handling
- Use try-catch with proper error types
- Provide clear error messages to users
- Reuse shared HTTP helpers such as `jsonOk()` and `jsonError()` where the route already follows that pattern
- Don't silently ignore exceptions unless the feature has an explicit fallback
- Log errors with enough context to debug provider/runtime failures

### Data Validation
- Always validate input with Zod schemas
- Validate both query params and request bodies at the route boundary when needed
- Keep schemas close to the related feature (`*-route.schemas.ts`)
- Sanitize and trim user/external input before persistence or provider calls

## Key Files

| File | Purpose |
|------|---------|
| `MEMORY.md` | Project memory and lessons learned |
| `AGENTS.md` | This file - agent instructions for this project |
| `README.md` | Project overview, setup, usage, and architecture notes |
| `Description.md` | Detailed notes about chat memory and conversation compaction |
| `.codex/skills/` | Local Codex skills available in this repository |
| `app/_server/supabase/database.types.ts` | Auto-generated Supabase types |
| `package.json` | Dependencies and project scripts |

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `app/api/` | Thin Route Handlers delegating to feature modules |
| `app/_features/` | Domain code for assistant, chats, auth, calendar, memory, tasks, and timer |
| `app/_shared/` | Shared UI primitives and shared types |
| `app/_server/` | Server-only helpers for auth, HTTP responses, AI, and Supabase |
| `app/assistant/`, `app/settings/`, `app/setup/` | App Router pages and setup flows |
| `public/` | Static assets, including the audio worklet used by voice capture |

## Tools and Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Start production | `npm run start` |
| Lint code | `npm run lint` |
| Type check | `npm run typecheck` |
| Test | `npm run test` |
| Test watch mode | `npm run test:watch` |
| Generate DB types | `npm run gen-supabase-types` |

## Tech Stack

### Frontend
- Next.js 16 with App Router
- React 19.2 with TypeScript 5
- Tailwind CSS 4
- react-markdown + remark-gfm for rich assistant messages

### Backend
- Next.js Route Handlers
- Supabase (Auth + Postgres)
- Zod for request validation
- Vitest for unit tests

### Voice & Integrations
- Google Gemini Live API via `@google/genai`
- Gemini text generation and embeddings
- Google Calendar integration
- Google Tasks integration
- Browser audio APIs for microphone capture, playback, and wake word flow

## Important Patterns

### API Response
Most API responses follow a `success` boolean plus domain payload on success, and `error`/`message` fields on failure:
```typescript
return jsonOk({
  success: true,
  todos,
  count: todos.length,
});

return jsonError(400, {
  error: "INVALID_PAYLOAD",
  message: "Payload non valido",
});
```

### Component Structure
Keep App Router entrypoints thin and delegate feature logic to `app/_features`:
```typescript
import { ChatbotPageClient } from "@/app/_features/assistant";

export default function AssistantPage(): JSX.Element {
  return <ChatbotPageClient />;
}
```

### Validation
Use Zod schemas close to the route/feature boundary:
```typescript
import { z } from "zod";

export const taskCreateBodySchema = z.union([
  z.object({
    text: z.string().trim().min(1).max(500),
    texts: z.undefined().optional(),
  }),
  z.object({
    text: z.undefined().optional(),
    texts: z.array(z.string().trim().min(1).max(500)).min(1),
  }),
]);
```

## Preferences

- Provide concise, focused responses in Italian when user writes in Italian. Sacrifice the grammar for brevity also for documentation files
- Show code examples when helpful
- Explain the "why" behind changes
- Prefer editing existing files over creating new ones
- Only create documentation when explicitly requested
- Reuse existing functionality to avoid duplication
- Follow project boundaries and existing entrypoints instead of introducing parallel architectures
