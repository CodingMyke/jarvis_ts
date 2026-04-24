# Project Memory - Jarvis AI

This file serves as the long-term memory for the Jarvis AI project. It helps AI assistants understand the project context, patterns, and lessons learned.

## Project Purpose

Jarvis AI is a real-time voice assistant built with Next.js and Google Gemini Live API. Key capabilities:
- Real-time voice chat with streaming input/output
- Local wake word detection before connecting to Gemini
- Tool calling for calendar, todo, timer, memory, and chat-management actions
- Chat persistence with compaction and semantic search
- Supabase-backed episodic and semantic memories
- Google authentication plus Google Calendar and Google Tasks integrations
- Assistant-focused UI with chat history, voice orb, settings, and setup flows

## Coding Standards

### TypeScript/React
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS 4
- **Architecture**: Feature-first boundaries with `app/_features`, `app/_shared`, `app/_server`
- **Type hints**: Prefer explicit types for exports and public interfaces
- **JSDoc**: For public APIs and complex functions
- **Naming**: camelCase for functions/variables, PascalCase for components/types

### React Patterns
- **Minimize state**: Prefer derived state and dedicated managers over scattered local state
- **Custom hooks**: Co-locate hooks with the component or feature they support
- **Composition**: Favor composition over props drilling
- **Server/Client**: Use Server Components by default
- **Thin entrypoints**: Pages, layouts, and routes should stay thin and import via root entrypoints only

### General
- Indentation: 2 spaces
- Max line length: 100-120 characters
- Error handling: Try-catch with proper error types and actionable messages
- Validation: Use Zod for route payloads and query parsing

## Common Workflows

### Git Workflow
- Follow GitHub Flow (feature branches from main)
- Use Conventional Commits format:
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation
  - `refactor:` code refactoring
  - `test:` adding tests
  - `chore:` maintenance
  - `style:` formatting only

### Testing
- Test stack is **configured** with Vitest
- Current test environment: Node via `vitest.config.ts`
- Test files live under `app/**/*.test.ts`
- Run tests with: `npm run test`
- For watch mode: `npm run test:watch`
- Always run relevant tests before committing

### Code Quality
- Lint code: `npm run lint`
- Type check: `npm run typecheck`
- Build check: `npm run build` (for critical changes)

### Development
- Start dev server: `npm run dev`
- Generate Supabase types: `npm run gen-supabase-types`
- Review setup docs when needed:
  - `app/_server/supabase/SUPABASE_SETUP.md`
  - `app/_features/calendar/server/GOOGLE_CALENDAR_SETUP.md`
  - `app/_features/tasks/server/GOOGLE_TASKS_SETUP.md`

## Key Files

- `MEMORY.md` - This file, project memory for AI assistants
- `AGENTS.md` - Agent instructions
- `README.md` - Project overview and setup
- `Description.md` - Detailed notes about chat memory and compaction
- `package.json` - Scripts and dependencies
- `app/_server/supabase/database.types.ts` - Auto-generated Supabase types
- `app/_features/assistant/lib/jarvis.config.ts` - Assistant identity, language, wake word, and prompt rules

## Architecture Decisions

### API Routes
- Keep route handlers in `app/api/*/route.ts` thin and delegate to feature modules
- Validate payloads and query params with Zod in feature-local schema files
- Use `jsonOk()` / `jsonError()` where the route follows the shared HTTP helper pattern
- Protected chat and memory routes use Supabase auth context from cookies

### Data Fetching
- Client-side modules mostly use direct `fetch()` calls to Route Handlers
- Chat persistence flows through `/api/chats` using create/fetch/append/delete helpers
- Append only the delta of new turns instead of resending the entire conversation
- Local providers/state (`TodoContext`, `TimerContext`, voice chat hook state) are preferred over introducing extra global data layers

### AI Integration
- **Gemini Live API**: Real-time voice conversation
- **gemini-2.0-flash**: Chat summaries, chat titles, and server-side summarization tasks
- **gemini-embedding-001**: Semantic search embeddings for memories and chats
- Tool definitions use a custom recursive JSON-schema-like contract with runtime validation helpers

### Database
- Supabase stores auth state plus the `chats`, `episodic_memory`, and `semantic_memory` tables
- `summary_text` is stored alongside vector embeddings for chat search/debuggability
- Semantic search relies on embeddings plus dedicated search functions/RPCs
- TypeScript DB types are generated into `app/_server/supabase/database.types.ts`

## Known Pitfalls

### React/Next.js
- Don't import legacy paths like `@/app/components`, `@/app/hooks`, or `@/app/lib`; ESLint explicitly forbids them
- Pages, layouts, and route handlers must import only from `@/app/_features/*`, `@/app/_shared`, or `@/app/_server`
- Server-only code must not leak into Client Components
- Voice features depend on browser APIs, so guard client-only behavior carefully

### TypeScript
- Don't use `any` for internal code; narrow external provider payloads at the boundary instead
- Reuse shared types like `ConversationTurn`, provider result types, and tool types
- Infer request shapes from Zod when possible
- Keep exported function signatures explicit

### Voice Chat
- The assistant session machine has only three runtime states: `idle`, `wake_word`, `connected`
- `assistant_history` is the model context; `full_history` is the UI history
- Wake word listening, end conversation, disable assistant, delete chat, and switch chat are distinct flows
- Client localStorage storage still exists, but durable conversation persistence happens through `/api/chats`

### Supabase / Google Integrations
- Chat and memory routes require a valid Supabase session from cookies
- Calendar/Tasks providers can fail with `REFRESH_TOKEN_EXPIRED` and need reauthorization
- Embeddings and summary generation require a valid Gemini API key
- Keep text fields and embeddings aligned for semantic search features

## Common Patterns

### Custom Hook Pattern
```typescript
function useMyFeature() {
  // Feature state and handlers
  return { state, handlers };
}

export function MyComponent(): JSX.Element {
  const { state, handlers } = useMyFeature();
  return <div>{/* Clean JSX */}</div>;
}
```

### API Route Pattern
```typescript
export async function GET() {
  try {
    return await handleGetTasks();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      errorMessage: message,
    });
  }
}
```

### Tool Definition Pattern
```typescript
export const createTodoTool: SystemToolDefinition = {
  name: "createTodo",
  description: "Crea uno o più todo",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string" },
    },
  },
  execute: async (args) => {
    // Validate args and call the related API route
  },
};
```

## Verification

Before completing any task:
1. Run linter: `npm run lint`
2. Type check: `npm run typecheck`
3. Run tests when relevant: `npm run test`
4. For critical changes, build: `npm run build`
5. Test voice/audio/auth flows in browser for UI/runtime changes
6. Verify route behavior, validation, and configuration assumptions

## Project-Specific Notes

### Voice Assistant
- `JARVIS_CONFIG` is the central place for assistant name, voice, language, wake word, and system prompt rules
- Wake word runs locally until activation, then the app connects to Gemini Live
- The assistant exposes tools for chats, calendar, tasks, timer, memories, and assistant/session control

### Chat Persistence
- Durable chat state is stored in Supabase `chats`
- `assistant_history` is compacted when it grows beyond the summary window; chat-level summary and embedding are updated for search
- Search/switch-chat flows rely on `summary_text` plus embeddings instead of naive keyword matching

### Calendar, Tasks, and Memory
- Google Calendar and Google Tasks setup is documented inside each feature's `server/` folder
- Memories are split into episodic and semantic tables/routes and should stay distinct
- Use the memory routes/services instead of bypassing feature modules directly

---
*Update this file whenever you learn something new about the project: "Update MEMORY.md with this lesson"*
