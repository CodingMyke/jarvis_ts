# Piano Test Coverage Reale

## Summary
Obiettivo: portare il progetto a un gate minimo di `80%+` con test che verifichino il comportamento reale dei moduli, senza modificare il codice applicativo per "assecondare" i test.

Baseline rilevata: oggi esistono 5 file di test, 20 test verdi, solo coverage su schemi/Zod e `session-machine`; il progetto non ha ancora né provider coverage né stack `jsdom`/Testing Library in `package.json` e `vitest.config.ts` è limitato a `environment: "node"` e `app/**/*.test.ts`.

## Principi vincolanti
- I test devono seguire la logica implementata e i contratti pubblici attuali.
- Non si modifica il codice di produzione per far passare i test.
- Se un modulo è difficile da testare in isolamento, si testa al livello corretto superiore invece di introdurre refactor artificiali.
- I mock devono sostituire solo dipendenze esterne o non deterministiche: `fetch`, Supabase, Gemini, timer/audio/browser API.

## Cambiamenti tecnici previsti all'infrastruttura di test
- Aggiungere dipendenze dev: `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- Estendere `vitest.config.ts`:
  - supporto a `*.test.tsx`
  - project o pattern distinti `node` / `jsdom`
  - setup file comune per mock globali e cleanup
  - coverage con report `text`, `html`, `json`
  - exclude espliciti per generated/types/static exports
- Aggiungere script dedicati:
  - `test:coverage`
  - opzionale `test:unit`, `test:ui`
- Aggiungere utility condivise in `tests/`:
  - factory dati chat/memory/task/calendar
  - mock Supabase chainable
  - helper `NextRequest`/`NextResponse`
  - mock `fetch`
  - fake browser APIs: `requestAnimationFrame`, `AudioContext`, `localStorage`

## Ambito di test da implementare

### 1. Server helpers e utilita piccole
Copertura completa dei moduli semplici ma usati ovunque:
- `app/_server/http/zod.ts`: path message, fallback senza issue.
- `app/_server/http/responses.ts`: status/body di `jsonOk` e `jsonError`.
- `app/_features/assistant/lib/storage/conversation-storage.ts`: mapping `Message -> ConversationTurn`, threshold summarization, save/load/clear, JSON corrotto, guard `window`.
- `app/_features/assistant/lib/conversation-persistence.ts`: `POST/PATCH/GET/DELETE`, body inviati, handling `response.ok=false`, fallback messaggi errore.

### 2. Service layer con logica reale
Qui va la parte piu importante della coverage.
- Chats service `app/_features/chats/server/chats.service.ts`:
  - create/get/list/delete success + errori Supabase
  - search semantica: query vuota, embedding failure, RPC failure, mapping risultati
  - append: delta turns, compaction oltre `SUMMARY_WINDOW_SIZE`, failure di compaction tollerato, generation di `summary_text`, `summary_embedding`, titolo solo al primo salvataggio, fallback `"Chat"`
- Memory services episodic/semantic:
  - create con trim e validazione contenuto
  - deduplication sopra soglia `0.85` con update invece di insert
  - embedding failure
  - update con nessun campo, contenuto vuoto, not found
  - search success/error e mapping payload
- Tasks service `app/_features/tasks/server/tasks.service.ts`:
  - caching `cachedDefaultTaskListId`
  - nessuna task list disponibile
  - create/update/delete success/failure
  - `deleteAllTasks` con zero task e con delete parziali
- Calendar service `app/_features/calendar/server/calendar.service.ts`:
  - mock provider behavior reale: get/create/update/delete
  - provider selection/config branches
  - mapping/ordinamento intervalli dove applicabile
- Embeddings/LLM facade:
  - `app/_server/ai/embeddings/embeddings.service.ts`: cache provider, facade object, `isConfigured`
  - `app/_server/ai/llm/gemini-summary.ts`: prompt building, empty input, truncation title/summary, env key fallback

### 3. Route handlers e route API
Testare il contratto HTTP, non l'implementazione interna.
- Handler calendar/tasks/chats:
  - payload invalidi
  - branch `not configured`
  - success shape corretta
  - status code distinti `400/401/404/500/503`
  - merge body/query nei `DELETE`
- Route Next API:
  - auth success/unauthorized
  - `request.json()` che fallisce su `POST/DELETE`
  - catch globale `EXECUTION_ERROR`
  - wiring corretto verso handler/service
- Priorita alta per:
  - `app/api/chats/route.ts`
  - memory routes episodic/semantic/search
  - `app/api/tasks/route.ts`
  - `app/api/calendar/events/route.ts`
  - auth Google routes per redirect e gestione env/errori

### 4. Assistant runtime e orchestration
Coprire i moduli con branching alto e side effect.
- `app/_features/assistant/lib/transport/tool-dispatcher.ts`:
  - system tool foreground
  - user tool
  - missing tool
  - background memory write
  - background search when write presente nello stesso turn
  - `onToolExecuted`, `onError`, `sendToolResponses`
- Tool definitions:
  - suite parametrica per tutti i tool esportati da `app/_features/assistant/tools/system-tools.ts`
  - contratto minimo: nome univoco, description non vuota, schema valido, `execute` ritorna shape coerente
  - test specifici solo per tool con logica propria significativa: parsing date, validazioni testo, formattazione messaggi
- Timer manager `app/_features/timer/lib/timer.manager.ts`:
  - start/stop/pause/resume
  - scadenza timer con fake timers + RAF
  - subscription/unsubscribe
  - notifica rate-limited
  - stop notification sound / doppia riproduzione
- Hook `app/_features/assistant/hooks/useVoiceChat.ts`:
  - bootstrap con chat iniziale
  - creazione chat al primo salvataggio
  - append delta e `lastSavedTurnCountRef`
  - transizioni `idle -> wake_word -> connected`
  - `goToIdle`, `goToWakeWord`, `deleteChat`, clear conversation
  - timeout inattivita
  - gestione errori fetch/client/wake word
  - nessun test su dettagli interni del DOM; solo stato esposto e side effects osservabili

### 5. UI/browser tests mirati
Solo componenti con logica o side effect, non presentational-only.
- `app/_features/tasks/ui/TodoContext.tsx`: fetch iniziale, invalidation, create/update/delete, delete completed, fallback errore, guard empty update.
- `app/_features/timer/ui/TimerContext.tsx`: subscribe iniziale, actions corrette, errore fuori provider.
- `app/_features/assistant/ui/ChatbotPageClient.hooks.ts`: `useOrbState`, `useDateTime`, update refs e cleanup interval.
- `app/_features/calendar/ui/UpcomingEvents.tsx`: render condizionale, toggle expand, scroll offset/reset con mock layout/RAF.
- `app/_features/assistant/ui/MessageList.tsx`, `app/_features/assistant/ui/FloatingChat.tsx`, `app/_features/timer/ui/TimerDisplay.tsx` solo se la coverage finale resta sotto target o emergono bug reali.

## Esclusioni esplicite
Non scrivere test dedicati per:
- file `index.ts` di solo re-export
- icone e primitive UI senza logica
- `database.types.ts` generato
- integrazioni reali con Google/Supabase/Gemini live
- E2E Playwright in questo passaggio

## Ordine operativo
1. Abilitare coverage e ambiente `jsdom`.
2. Aggiungere test helpers condivisi.
3. Coprire service layer `chats`, `memory`, `tasks`, `calendar`.
4. Coprire handler e route API.
5. Coprire orchestration assistant (`tool-dispatcher`, tool definitions, timer).
6. Coprire hook/context/component browser critici.
7. Eseguire coverage report e chiudere i gap residui solo nei moduli ancora sotto-soglia e ad alto rischio.

## Casi di test/accettazione finali
- `npm test` verde.
- `npm run test:coverage` verde con `80%+` line/statement/function/branch sul codice in scope.
- Nessun modulo critico con rami di errore non testati: chats, memory, tasks, calendar, timer, tool-dispatcher, useVoiceChat.
- I test falliscono se si rompe il comportamento osservabile reale: payload HTTP, mapping dati, transizioni di stato, compaction, deduplication, timeout, callback.

## Public APIs / interfacce coinvolte
Nessuna modifica funzionale prevista alle API runtime del progetto.

Aggiunte previste solo all'interfaccia di sviluppo/test:
- script npm di test/coverage
- config Vitest estesa
- setup file e test utilities condivise

## Assunzioni e default scelti
- Scope confermato: `Unit + Integration + UI tests jsdom`, senza E2E.
- Gate di completamento: `80%+`.
- Se un modulo e oggi troppo accoppiato a browser/network, si useranno mock/stub e test al livello pubblico esistente, non refactor di produzione per renderlo "piu testabile".
- I file di test seguiranno il naming gia presente e saranno co-locati vicino ai moduli.
