# Chat Memory & Conversation Compaction

## Overview per LLM

Specifica per **memoria chat** e **compattazione conversazione**: persistenza su Supabase (tabella `chats`), compattazione sliding-window con summary LLM, ricerca semantica per switch in linguaggio naturale, integrazione con voice chat (useVoiceChat / VoiceChatClient). La persistenza della conversazione avviene via API backend; non dipendere dal solo localStorage.

---

## Contesto progetto

- **Stack**: Next.js 16, React 19, TypeScript, Supabase (auth + `episodic_memory`, `semantic_memory`, `chats`), Gemini Live API per voice chat.
- **Voice chat**: già implementata (Gemini Live, wake word, tools calendario/todo/timer/memorie, clearChat, endConversation, disableAssistant). Il client usa `ConversationTurn[]` per history; i turni hanno forma `{ role: 'user' | 'model', parts: [{ text: string }], thinking?: string }`.
- **Regola vincolante** (`.cursor/rules/embedding-text.mdc`): qualsiasi cosa con embedding DEVE avere una rappresentazione testuale in chiaro (debug, qualità, spiegabilità).

---

## Database: tabella `chats`

Tabella già presente su Supabase:

| Colonna             | Tipo        | Note                                                      |
| ------------------- | ----------- | --------------------------------------------------------- |
| `id`                | uuid        | PK                                                        |
| `user_id`           | uuid        | Proprietario                                              |
| `title`             | text        | Generato da LLM da summary_text                           |
| `full_history`      | jsonb       | Array di turni completi (per UI)                         |
| `assistant_history` | jsonb       | Array di turni per il modello (compattato)               |
| `summary_text`      | text        | Rappresentazione in chiaro (gemella di summary_embedding) |
| `summary_embedding` | vector      | pgvector (per similarity search)                          |
| `last_activity_at`  | timestamptz | Ultima interazione                                        |
| `created_at`        | timestamptz | Creazione                                                 |

- **Forma turni**: `ConversationTurn` → `{ role: 'user' | 'model', parts: [{ text: string }], thinking?: string }`. Il messaggio di summary è un turno: `{ role: 'model', parts: [{ text: "<summary>" }] }`.
- **RPC**: `search_chats_semantic(p_query_embedding, p_limit?, p_max_distance?)` — usata per switch in linguaggio naturale.

---

## Costanti compattazione

- `SUMMARY_WINDOW_SIZE` = 30: assistant_history deve avere sempre al massimo 30 turni; se ce ne sono di più si compatta (riassunto + ultimi 29 messaggi).

Comportamento: finché `assistant_history.length <= SUMMARY_WINDOW_SIZE` nessuna compattazione. Quando supera: si riassume la parte vecchia in un unico turno (LLM) e si tengono gli ultimi 29 messaggi; il totale è sempre ≤ 30 (1 riassunto + 29). `summary_text` e `summary_embedding` a livello chat sono generati separatamente (descrizione tema della chat per ricerca/switch).

---

## API `/api/chats`

Auth da cookie Supabase (`ensureAuth`), coerente con `app/api/memory/episodic/`.

- **POST /api/chats** – Crea chat (body opzionale: `title`, messaggi iniziali). `full_history` e `assistant_history` uguali; `summary_text`/`summary_embedding` vuoti finché non c’è compattazione.
- **GET /api/chats** – `?id=uuid` ritorna la chat (UI: `full_history`, modello: `assistant_history`). `?search=query` → embed query → RPC `search_chats_semantic` → ranking (similarità + `last_activity_at`) → 1 o più match (conferma se multipli).
- **PATCH /api/chats** – Append messaggi a `full_history` e `assistant_history`; aggiorna `last_activity_at`; se `assistant_history.length > SUMMARY_WINDOW_SIZE` esegue compattazione, poi aggiorna `summary_text` e `summary_embedding`.
- **DELETE /api/chats** – Elimina chat (opzionale).

Logica compattazione e summary/embedding in modulo condiviso (es. `app/api/chats/functions.ts`), riutilizzando `app/lib/embeddings` e servizio LLM per testo summary/titolo (Gemini).

---

## Generazione summary e titolo

- **Summary (compattazione)**: dati N `ConversationTurn`, LLM produce un unico testo di riassunto; poi `embed(summaryText)` per `summary_embedding`. Riutilizzare/estendere `app/lib/voice-chat/storage/summarizer.ts` con chiamata reale a Gemini.
- **Titolo chat**: generato dall’LLM da `summary_text` (o da `assistant_history` se summary_text vuoto). Aggiornato la prima volta quando il topic è chiaro; in seguito solo se il focus cambia (es. dopo compattazione con delta significativo).

---

## Integrazione client (voice chat)

- **useVoiceChat** e **VoiceChatClient**: supporto a `chatId` (da route o contesto). All’avvio: se `chatId` presente, GET `/api/chats?id=chatId` e caricare `assistant_history` per `sendHistory()` e `full_history` per messaggi in UI; se assente, POST nuova chat e usare il suo `id`.
- **Salvataggio**: invece di (o in aggiunta a) `ConversationStorage` su localStorage, chiamare PATCH `/api/chats` con i nuovi turni (append) in `goToIdle` / `goToWakeWord` e prima di switchare chat. Obiettivo: **non** dipendere più dal solo localStorage per la persistenza.
- **Tool / UX “switch chat”**: “Passiamo alla chat in cui parlavamo di X” → GET `/api/chats?search=query` → se un match chiaro, switch a quel `chatId` e ricaricare contesto; se multipli, risposta con opzioni e conferma.

---

## Regole assistente e memorie

- **Assistente**: usare **solo** `assistant_history` (mai `full_history`), trattare i summary come verità consolidata, non ricostruire messaggi eliminati, non usare keyword per le chat; usare `summary_text` + `summary_embedding` come fonte per lo switch.
- **Memorie episodic/semantic**: hanno già `content` (testo) + `embedding`; rispettano la regola “embedding + testo in chiaro”. Nessuna modifica obbligatoria.

---

## Diagramma flusso (sintesi)

```
[User] → full_history, assistant_history
assistant_history → SUMMARY_WINDOW_SIZE → LLM summary → summary_text
summary_text → embed → summary_embedding
summary_embedding → search_chats_semantic (RPC)
[Search NL] → embed query → search_chats_semantic
```

---

## Struttura file rilevante

```
app/
├── api/
│   ├── chats/
│   │   ├── route.ts       # POST, GET (id/search), PATCH, DELETE
│   │   ├── functions.ts  # CRUD, append, compattazione, search RPC
│   │   └── model.ts      # Tipi request/response
│   └── memory/           # episodic, semantic (pattern auth)
├── lib/
│   ├── voice-chat/
│   │   ├── storage/
│   │   │   ├── summarizer.ts   # Summary reale (Gemini)
│   │   │   └── types.ts       # ConversationTurn
│   │   └── config/            # SUMMARY_WINDOW_SIZE
│   ├── embeddings/       # embed(), embedBatch()
│   └── supabase/
│       └── database.types.ts   # chats, search_chats_semantic
└── hooks/
    └── useVoiceChat.ts   # chatId, GET/PATCH, persistenza backend
```

Ordine implementativo suggerito: regola embedding-text → tipi DB → costanti e forma turni → modulo compattazione e funzioni chat → route API → integrazione useVoiceChat/VoiceChatClient → tool switch chat → verifica (solo assistant_history al modello, embedding + summary_text).
