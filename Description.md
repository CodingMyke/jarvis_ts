# Chat Memory & Conversation Retention

## LLM-Oriented Overview

This document specifies **chat memory** and **conversation retention**: Supabase persistence (`chats` table), a rolling assistant-history window without summary-turn compaction for now, semantic search for natural-language chat switching, and integration with voice chat (`useVoiceChat` / transport layer).

Conversation durability must rely on backend APIs, not on localStorage alone.

---

## Project Context

- **Stack**: Next.js 16, React 19, TypeScript, Supabase (auth + `chats`, `episodic_memory`, `semantic_memory`), Gemini Live API for voice chat.
- **Voice chat**: already implemented (Gemini Live, wake word, tools for calendar/tasks/timer/memory/chats, clear chat, end conversation, disable assistant).
- **Turn shape**: `ConversationTurn[]` where each turn is `{ role: 'user' | 'model', parts: [{ text: string }], thinking?: string }`.
- **Hard rule**: anything with embeddings must keep a clear-text representation (debuggability, quality, explainability).

---

## Database: `chats` table

| Column              | Type        | Notes                                                   |
| ------------------- | ----------- | ------------------------------------------------------- |
| `id`                | uuid        | PK                                                      |
| `user_id`           | uuid        | Owner                                                   |
| `title`             | text        | LLM-generated (from `summary_text`)                    |
| `full_history`      | jsonb       | Complete turns for UI                                  |
| `assistant_history` | jsonb       | Most recent raw turns for model context                |
| `summary_text`      | text        | Clear-text twin of summary embedding                   |
| `summary_embedding` | vector      | pgvector embedding for semantic search                 |
| `last_activity_at`  | timestamptz | Last interaction timestamp                             |
| `created_at`        | timestamptz | Creation timestamp                                     |

Notes:
- `assistant_history` keeps the newest raw turns only; older turns are trimmed, not summarized.
- Semantic search uses Supabase RPC `search_chats_semantic(p_query_embedding, p_limit?, p_max_distance?)`.

---

## Retention Constants

- `SUMMARY_WINDOW_SIZE = 30`.
- `assistant_history` must stay `<= SUMMARY_WINDOW_SIZE`.

Behavior:
- No trimming while `assistant_history.length <= SUMMARY_WINDOW_SIZE`.
- When it exceeds the window, drop the oldest turns and keep the newest 30 turns.
- Result always stays `<= 30` turns of raw context.
- Chat-level `summary_text` and `summary_embedding` remain separate metadata for search/switch use cases.

---

## API: `/api/chats`

Auth is cookie-based Supabase auth (`getAuthContext`), consistent with protected route patterns.

- **POST `/api/chats`**: create a chat (`title` + optional initial turns). `full_history` and `assistant_history` start equal. `summary_text` and `summary_embedding` are initially null.
- **GET `/api/chats?id=...`**: fetch one chat (UI gets `full_history`; assistant consumes `assistant_history`).
- **GET `/api/chats?search=...`**: embed query, call semantic RPC, return ranked matches.
- **PATCH `/api/chats`**: append turns, update `last_activity_at`, trim when needed, regenerate summary/embedding when needed.
- **DELETE `/api/chats`**: remove one chat.

---

## Summary and Title Generation

- **Search summary**: separate chat-level summary text for semantic retrieval.
- **Chat title**: generated from summary text when meaningful context exists.
- **Embedding**: generated from summary text and stored as `summary_embedding`.

---

## Client Integration (Voice Chat)

- `useVoiceChat` handles chat lifecycle with backend persistence.
- On startup:
  - If `chatId` exists: load `assistant_history` for model context + `full_history` for UI.
  - If no `chatId`: create a new chat via POST.
- On persistence points: append delta turns through PATCH (not full-history replay).
- Natural-language chat switch flow:
  - Query `/api/chats?search=...`.
  - If one clear match: switch directly.
  - If multiple plausible matches: ask user confirmation.

---

## Assistant Rules and Memory Behavior

- The model should consume only `assistant_history`, never `full_history`.
- Removed turns are unavailable; do not reconstruct them or assume summary turns exist.
- Chat switching should rely on semantic summaries (`summary_text` + embedding), not naive keyword matching.
- Episodic/semantic memory tables remain independent from chat compaction behavior.

---

## Flow Summary

```text
User turns -> full_history + assistant_history
assistant_history > SUMMARY_WINDOW_SIZE -> trim oldest turns
summary_text -> embedding -> summary_embedding
search query -> query embedding -> search_chats_semantic RPC
```

---

## Relevant File Structure (Current)

```text
app/
├── api/
│   └── chats/
│       └── route.ts                         # GET, POST, PATCH, DELETE
├── _features/
│   ├── chats/server/
│   │   ├── chats-route.handlers.ts          # route-level handlers
│   │   ├── chats-route.schemas.ts           # Zod schemas
│   │   ├── chats.service.ts                 # CRUD, append, retention, semantic search
│   │   └── chats.types.ts                   # request/response models
│   └── assistant/
│       ├── hooks/useVoiceChat.ts            # chat boot, persistence, switching
│       └── lib/config/compaction.config.ts  # SUMMARY_WINDOW_SIZE
├── _server/
│   ├── ai/
│   │   ├── llm/gemini-summary.ts            # summary and title generation
│   │   └── embeddings/embeddings.service.ts # embedding generation
│   └── supabase/database.types.ts           # chats table + RPC types
```

Suggested implementation order for related changes:
1. Keep embedding + clear-text pairing invariant.
2. Update DB types/contracts if schema changes.
3. Update retention constants/turn logic.
4. Update chat service + route handlers.
5. Update voice chat integration and switch flow.
6. Verify model uses only `assistant_history`.
