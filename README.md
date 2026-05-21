# Jarvis AI - Interactive Voice Assistant

A real-time AI voice assistant powered by **Google Gemini Live API**, with wake word activation, function calling (calendar, todo, timer, memories, progression), and Google + Supabase authentication.
Authenticated users now land on a shared `/dashboard` shell.

## Main Features

- **Real-time voice chat**: bidirectional streaming with Gemini Live API (WebSocket), low latency, and natural barge-in interruptions
- **Wake word**: local listening until a keyword is detected (for example, "Jarvis"), then live Gemini connection starts
- **Live transcripts**: real-time text for both user input and model output
- **Function calling**: built-in tools for real actions
  - **Calendar**: Google Calendar events (create, update, delete, list)
  - **Todo**: Google Tasks items (create, update, delete, list)
  - **Timer**: start, pause, resume, stop, status
  - **Memories**: episodic and semantic memories (Supabase), create/update/search/delete
  - **Session control**: end conversation, clear chat, disable assistant
- **Conversation persistence**: Supabase-backed chat storage with rolling assistant history and semantic search; automatic summary-turn compaction is disabled for now
- **Voice Chat Runtime**: one shared runtime owns wake word, Gemini transport, transcript projection, persistence, reconnect flows, and chat switching/deletion/new-chat orchestration
- **Progression system**: Supabase-backed goals, recurring actions, server-rendered daily/weekly visibility, XP history, leveling, and deadline review in `/progression`
- **Academy reels board**: owner-scoped editorial Kanban in `/academy/reels` with `ai_idea -> idea -> script -> to_record -> to_edit -> ready -> published`, drawer editing, explicit `Approve` for AI ideas, drag/drop status changes, rejected-ai-idea snapshots on delete, and a published-column cap with placeholder archive routes
- **Academy reel automation**: `Reel Scripting` + `Reel Idea Generation`, per-user nested automation settings in `/academy/automation`, spawned run-process orchestration, run logs, and local worker execution
- **User timezone settings**: `/settings` stores a per-user timezone preference used by progression and automation scheduling
- **Authentication**: Google OAuth via Supabase; memory/calendar/tasks routes are session-protected
- **UI**: thin App Router entrypoints, feature boundaries, markdown chat rendering, voice orb, shared app shell (`/dashboard` + sibling sections), dashboard calendar + ToDo blocks (explicit empty/error states), progression workspace + deadline warning, standalone legacy `/assistant`, standalone `/setup/calendar`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5, Tailwind CSS 4
- **Voice**: Google Gemini Live API (`@google/genai`)
- **Auth and DB**: Supabase (auth, `chats`, `episodic_memory`, `semantic_memory`, progression tables + RPCs)
- **Integrations**: Google Calendar, Google Tasks (server-side OAuth)
- **Message rendering**: react-markdown, remark-gfm

## Prerequisites

- Node.js 20+
- Modern browser with Web Audio API and WebSocket support
- Microphone and browser permissions
- Google account (for auth and optionally Calendar/Tasks)
- Gemini API key and a configured Supabase project

## Installation

1. Clone the repository and enter the project folder:
   ```bash
   git clone <repository-url>
   cd jarvis_ts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   For Calendar and Tasks setup, see:
   - `app/_features/calendar/server/GOOGLE_CALENDAR_SETUP.md`
   - `app/_features/tasks/server/GOOGLE_TASKS_SETUP.md`

### Supabase CLI Link (Required for Migrations/DDL)

Run once in this repository:

```bash
supabase init
supabase login --token <your_supabase_personal_access_token>
supabase link --project-ref surbhsaedsnkcpswwann
supabase db query --linked "select now();"
```

If `--linked` works, the project is ready for migrations, schema changes, and data operations from CLI.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Login**: sign in with Google (required for memories, calendar, and tasks); default authenticated landing route is `/dashboard`.
2. **Dashboard**: `/dashboard` shows `Eventi` and `ToDo` side by side when space allows (wrap on smaller widths).
   Calendar empty/error states: `Nessun evento nei prossimi 7 giorni` / `Si è verificato un errore`.
   ToDo empty/error states: `Non ci sono elementi` / `Si è verificato un errore`.
3. **Academy**: `Accademia` expands in the shared sidebar and currently exposes `/academy/reels`, `/academy/automation`, `/academy/courses`, and `/academy/reels/published`.
   Reel scope: statuses `ai_idea`, `idea`, `script`, `to_record`, `to_edit`, `ready`, `published`; drawer edit; explicit `Approve` for AI ideas; manual AI idea trigger from the `AI idea` column; manual scripting generation (global/field) from drawer.
4. **Progression**: `/progression` shows XP level progress, due actions, weekly targets, goal filters, a lazy XP history sidebar, and a blocking deadline review only when expired goals exist.
   Progression reads the current timezone from `user_settings`, not from the progression profile.
5. **Start**: click the `Jarvis / Personal OS` logo box in the app-shell sidebar.
6. **Activation**: the assistant enters wake-word mode (yellow border).
   Say "Jarvis" (or your configured wake word) to connect (cyan border).
7. **Commands**: ask to create/edit events, tasks, timers, save memories, or search memories.
   Tools are called automatically, and the assistant session persists while navigating app-shell routes through one shared runtime provider.
8. **Stop**: click the same logo box to force `idle`, or end by voice
   (for example, "bye" or "thanks") to trigger end-conversation behavior.

## Project Structure

```text
jarvis_ts/
├── app/
│   ├── api/                     # Thin route handlers
│   ├── _features/               # Domain-organized feature code
│   │   ├── assistant/           # Assistant runtime, UI, tools, config
│   │   ├── auth/                # Auth hooks and UI
│   │   ├── calendar/            # Actions, UI, route validators/handlers
│   │   ├── chats/               # Chat validators/handlers/services
│   │   ├── memory/              # Episodic/semantic memory logic
│   │   ├── progression/         # Goals, check-ins, XP, deadlines
│   │   ├── tasks/               # Actions, local sync, validators/handlers
│   │   └── timer/               # Timer provider
│   ├── _shared/                 # Shared UI system, primitives, and types
│   ├── _server/                 # Server helpers (http/auth/ai/supabase)
│   ├── (app-shell)/             # Shared authenticated shell routes
│   ├── assistant/               # Assistant page
│   └── setup/                   # Calendar/Tasks setup pages
├── public/
│   └── audio-capture-processor.worklet.js
├── Description.md               # Deep spec for chat memory and retention
└── README.md
```

Legacy folders `app/components`, `app/hooks`, and `app/lib` were removed.
Allowed app entrypoint imports are `app/_features`, `app/_shared`, and `app/_server`.

## Scripts

```bash
npm run dev                 # Development
npm run build               # Production build
npm run start               # Production runtime
npm run lint                # ESLint
npm run typecheck           # TypeScript strict check
npm run test                # Vitest unit tests
npm run test:watch          # Vitest watch mode
npm run test:coverage       # Vitest coverage report
npm run gen-supabase-types  # Regenerate Supabase TypeScript types
npm run reels:worker        # Run local reel generation worker
```

## Architecture Workflow

- Pages, layouts, and routes stay thin and import through `app/_features`, `app/_shared`, and `app/_server`.
- The shared UI system now lives in `app/_shared/ui`, with semantic tokens in `app/_shared/ui/tokens` and reusable atoms/molecules/organisms exported from the same boundary.
- `app/design` stays a composition layer for templates, page assemblies, and feature-facing UI composition on top of `app/_shared/ui`; it is no longer the source of truth for shared primitives.
- Shared authenticated navigation lives in `app/(app-shell)` and exposes `/dashboard`, `/projects`, `/academy/reels`, `/academy/courses`, `/academy/reels/published`, `/reflections`, `/learning`, `/progression`, `/news`, and `/settings`.
- `/settings` includes the per-user timezone preference used by progression day-boundaries and Academy automation scheduling.
- `/academy/automation` owns the nested `Reel Scripting` and `Reel Idea Generation` settings UI.
- The Academy Reel workspace is owned by `app/_features/academy/reels` for domain/API logic and `app/design/templates/academy` + `app/design/organisms/academy` for the board UI.
- Reel automation discovery runs in `scripts/reels-worker.ts`; each due flow run is executed in a spawned child process through `scripts/reel-automation-run.ts`.
- The live assistant session is owned by `app/_features/assistant/runtime`, mounted once in `app/layout.tsx` through `VoiceChatRuntimeProvider`.
- `useVoiceChat` is now a thin adapter over the runtime snapshot + commands instead of owning the session lifecycle.
- Calendar/task refresh side effects stay in UI adapters (`AppShellAssistantProvider`, `useAssistantWorkspace`) through runtime `tool executed` subscriptions.
- The progression flow is owned by `app/_features/progression`, with Supabase RPC-backed XP/check-in mutations, server-composed `/progression` sections for level/goals/today/deadlines, and client-only islands for edits, check-ins, deadline actions, and on-demand XP history.
  Current-local calculations read the timezone from `app/_features/user-settings`.
- `/assistant` stays available as a legacy standalone protected route and is not exposed in the main shell navigation.
- `/setup/calendar` stays standalone + protected, discoverable from the `/settings` page (`Integrazioni` section).
- API routes validate inputs with Zod and delegate business logic to feature handlers/services.
- Assistant tools use a recursive typed JSON-schema-like contract.
- Task synchronization uses local invalidation through `TodoProvider`/`useTodos` (no global event bus).

## Permissions and Security

- **Microphone**: required for wake word and voice interaction.
- **HTTPS**: recommended in production (required for some browser APIs).
- **Gemini API key**: currently used client-side; evaluate ephemeral token strategies in production.

## Troubleshooting

- **Microphone not working**: verify browser permissions and selected input device.
- **No voice response**: check volume, Gemini API key validity, and browser console WebSocket errors.
- **Memories/Calendar/Tasks not working**: confirm login status and Supabase/Google setup.

## References

- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)

## License

Private project - All rights reserved.