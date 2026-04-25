# Jarvis AI - Interactive Voice Assistant

A real-time AI voice assistant powered by **Google Gemini Live API**, with wake word activation, function calling (calendar, todo, timer, memories), and Google + Supabase authentication.
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
- **Conversation persistence**: Supabase-backed chat storage with compaction and semantic search (local storage is used as a client-side layer)
- **Authentication**: Google OAuth via Supabase; memory/calendar/tasks routes are session-protected
- **UI**: thin App Router entrypoints, feature boundaries, markdown chat rendering, voice orb, shared app shell (`/dashboard` + sibling sections), dashboard calendar view for next 7 days (with explicit empty/error states), standalone legacy `/assistant`, standalone `/setup/calendar`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5, Tailwind CSS 4
- **Voice**: Google Gemini Live API (`@google/genai`)
- **Auth and DB**: Supabase (auth, `chats`, `episodic_memory`, `semantic_memory`)
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
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   For Calendar and Tasks setup, see:
   - `app/_features/calendar/server/GOOGLE_CALENDAR_SETUP.md`
   - `app/_features/tasks/server/GOOGLE_TASKS_SETUP.md`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Login**: sign in with Google (required for memories, calendar, and tasks); default authenticated landing route is `/dashboard`.
2. **Dashboard**: `/dashboard` shows calendar events for the next 7 days; when empty it shows `Nessun evento nei prossimi 7 giorni`, and on load error `Si è verificato un errore`.
3. **Start**: click the microphone orb; the assistant listens locally for the wake word.
4. **Activation**: say "Jarvis" (or your configured wake word); the app connects to Gemini and starts live voice chat.
5. **Commands**: ask to create/edit events, tasks, timers, save memories, or search memories; tools are called automatically.
6. **End conversation**: explicitly finish (for example, "bye" or "thanks") to trigger end-conversation behavior, or ask to disable the assistant.

## Project Structure

```text
jarvis_ts/
├── app/
│   ├── api/                     # Thin route handlers
│   ├── _features/               # Domain-organized feature code
│   │   ├── assistant/           # Assistant hook/UI/tool schema/config
│   │   ├── auth/                # Auth hooks and UI
│   │   ├── calendar/            # Actions, UI, route validators/handlers
│   │   ├── chats/               # Chat validators/handlers/services
│   │   ├── memory/              # Episodic/semantic memory logic
│   │   ├── tasks/               # Actions, local sync, validators/handlers
│   │   └── timer/               # Timer provider
│   ├── _shared/                 # Shared UI primitives and types
│   ├── _server/                 # Server helpers (http/auth/ai/supabase)
│   ├── (app-shell)/             # Shared authenticated shell routes
│   ├── assistant/               # Assistant page
│   └── setup/                   # Calendar/Tasks setup pages
├── public/
│   └── audio-capture-processor.worklet.js
├── Description.md               # Deep spec for chat memory and compaction
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
```

## Architecture Workflow

- Pages, layouts, and routes stay thin and import through `app/_features`, `app/_shared`, and `app/_server`.
- Shared authenticated navigation lives in `app/(app-shell)` and exposes `/dashboard`, `/projects`, `/academy`, `/reflections`, `/learning`, `/progression`, `/news`, and `/settings`.
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
