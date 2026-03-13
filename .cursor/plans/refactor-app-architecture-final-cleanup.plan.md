# Refactor definitivo senza compatibilità legacy

## Summary

Obiettivo: completare il refactor in modo strutturale, eliminando ogni shim, re-export di transizione e directory legacy. Alla fine il progetto deve avere una sola topologia di import, una sola collocazione fisica per ogni modulo, nessun `app/components`, `app/hooks` o `app/lib/*` legacy come fonte applicativa, e boundary chiari tra `app/_features`, `app/_shared` e `app/_server`.

Decisioni già fissate:
- È ammesso rompere import interni e, se servisse, anche contratti esterni.
- Non devono restare stub o compat layer temporanei.
- La struttura finale può adattarsi rispetto al piano iniziale, ma deve restare feature-first e coerente.
- Ogni feature avrà un solo entrypoint pubblico canonico tramite `index.ts` di feature.

## Struttura finale target

```text
app/
  api/
    auth/
      google/route.ts
      callback/google/route.ts
    calendar/
      events/route.ts
    chats/
      route.ts
    memory/
      episodic/route.ts
      episodic/search/route.ts
      semantic/route.ts
      semantic/search/route.ts
    tasks/
      route.ts

  _features/
    assistant/
      index.ts
      hooks/
      lib/
      tools/
      ui/
      types/
    auth/
      index.ts
      hooks/
      lib/
      ui/
      types/
    calendar/
      index.ts
      lib/
      server/
      ui/
      types/
    chats/
      index.ts
      server/
      types/
    memory/
      index.ts
      server/
      types/
    tasks/
      index.ts
      lib/
      server/
      ui/
      types/
    timer/
      index.ts
      lib/
      ui/
      types/

  _shared/
    index.ts
    ui/
    lib/
    schemas/
    types/

  _server/
    index.ts
    auth/
    http/
    supabase/
    ai/
      embeddings/
      llm/

  assistant/
  auth/
  settings/
  setup/
```

## Regole architetturali finali

- Ogni feature espone un solo entrypoint pubblico: `@/app/_features/<feature>`.
- `_shared` espone un solo entrypoint pubblico: `@/app/_shared`.
- `_server` espone un solo entrypoint pubblico: `@/app/_server`.
- Le pagine, layout e route importano solo da questi entrypoint pubblici.
- Le feature non possono importare file interni di altre feature.
- `_shared` non può importare da `_features`.
- `_server` non può importare componenti client o hook React.
- Non devono esistere facade che riesportano codice da directory legacy.
- Quando un modulo viene spostato, il vecchio file viene eliminato nello stesso step, non lasciato come ponte.

## Mappa di migrazione obbligatoria

- `app/components/atoms`, `app/components/molecules`, `app/components/organisms`:
  - Spostare primitive riusabili in `app/_shared/ui`.
  - Spostare UI assistant in `app/_features/assistant/ui`.
  - Spostare UI auth in `app/_features/auth/ui`.
  - Spostare UI calendar in `app/_features/calendar/ui`.
  - Spostare UI tasks in `app/_features/tasks/ui`.
  - Spostare UI timer in `app/_features/timer/ui`.
  - Eliminare completamente l’impianto atoms/molecules/organisms e i relativi barrel `index.ts`.

- `app/hooks/useAuth.ts`:
  - Spostare implementazione reale in `app/_features/auth/hooks/useAuth.ts`.
  - Spostare helper browser auth in `app/_features/auth/lib`.
  - Eliminare `app/hooks`.

- `app/hooks/useVoiceChat.ts` e `app/lib/voice-chat/**`:
  - Spostare tutto sotto `app/_features/assistant`.
  - `useVoiceChat.ts` diventa la facade reale del feature, non un re-export.
  - Spezzare in moduli reali:
    - `hooks/useVoiceChat.ts`
    - `lib/session-machine.ts`
    - `lib/conversation-persistence.ts`
    - `lib/wake-word-lifecycle.ts`
    - `lib/transport/gemini-live-client.ts`
    - `lib/transport/tool-dispatcher.ts`
    - `lib/config/*.ts`
    - `types/*.ts`
    - `tools/definitions/*.ts`
    - `tools/schema.ts`
  - Eliminare interamente `app/lib/voice-chat`.

- `app/lib/calendar/**`:
  - Spostare action e mapper in `app/_features/calendar/lib`.
  - Spostare provider/service/schema/handler in `app/_features/calendar/server`.
  - Estrarre provider Google in moduli separati: auth/token, client HTTP, mapper, provider.
  - Eliminare `app/lib/calendar`.

- `app/lib/tasks/**` e `app/lib/todo/**`:
  - Assorbire i tipi `Todo` in `app/_features/tasks/types`.
  - Spostare action e logica client in `app/_features/tasks/lib`.
  - Spostare provider/service/schema/handler in `app/_features/tasks/server`.
  - Eliminare evento globale e qualsiasi coupling via bus condiviso o `window`.
  - La sincronizzazione tasks diventa responsabilità del provider/hook della feature tasks e dell’assistant shell.
  - Eliminare `app/lib/tasks` e `app/lib/todo`.

- `app/lib/timer/**`:
  - Spostare manager e tipi in `app/_features/timer/lib` e `app/_features/timer/types`.
  - Spostare provider/UI in `app/_features/timer/ui`.
  - Eliminare `app/lib/timer`.

- `app/lib/speech/**`:
  - Spostare in `app/_features/assistant/types` se usato solo dall’assistant/chat.
  - Se emerge riuso reale cross-feature, collocare in `app/_shared/types`.
  - Eliminare `app/lib/speech`.

- `app/lib/supabase/**`:
  - Spostare client/server helpers, tipi database e service in `app/_server/supabase`.
  - Spostare sign-in/sign-out browser in `app/_features/auth/lib`.
  - Aggiornare callback auth e proxy a usare solo `_server` o `_features/auth`.
  - Eliminare `app/lib/supabase`.

- `app/lib/embeddings/**` e `app/lib/llm/**`:
  - Spostare in `app/_server/ai/embeddings` e `app/_server/ai/llm`.
  - Aggiornare chats/memory/calendar/tasks server logic a importare solo da `_server`.
  - Eliminare `app/lib/embeddings` e `app/lib/llm`.

- `app/api/*/functions.ts` e `app/api/*/model.ts`:
  - Spostare in `app/_features/<feature>/server`.
  - Le route in `app/api/**/route.ts` restano solo entrypoint Next e non contengono logica di business.
  - Eliminare tutti i `functions.ts` e `model.ts` legacy sotto `app/api`.

## Implementazione per fasi

### Fase 1. Congelare i boundary e impedire nuovi import legacy

- Definire gli `index.ts` canonici per ogni feature, `_shared` e `_server`.
- Aggiornare ESLint per vietare:
  - import da `app/components/**`
  - import da `app/hooks/**`
  - import da `app/lib/**`
  - deep import verso internals di altre feature
- Definire una regola esplicita: route/page/layout importano solo da `@/app/_features/*`, `@/app/_shared`, `@/app/_server`.

### Fase 2. Migrare shared + auth + infrastruttura routing

- Spostare `Button`, `Header`, icone e primitive vere in `_shared/ui`.
- Spostare `useAuth`, `AuthButton`, `LoginPageClient`, `SettingsPageClient` in `_features/auth`.
- Spostare browser auth helpers in `_features/auth/lib`.
- Spostare Supabase server infra in `_server/supabase`.
- Rinominare `middleware.ts` in `proxy.ts` e riallineare la logica auth/protezione route.
- Aggiornare tutte le pagine/layout a usare solo i nuovi entrypoint.
- Eliminare `app/components/index.ts`, `app/components/*/index.ts`, `app/hooks`.

### Fase 3. Migrare calendar, tasks e timer come feature complete

- Calendar:
  - creare `app/_features/calendar/index.ts`
  - spostare `actions`, `types`, `UpcomingEvents`, `DayEvents`, `EventItem`
  - centralizzare validazione Zod, handler, service e provider Google nel feature
  - introdurre `CalendarProvider` e `useCalendar` per refresh feature-local

- Tasks:
  - creare `app/_features/tasks/index.ts`
  - spostare `TodoProvider`, `TodoList`, tipi e action
  - rimuovere definitivamente `notifyTodosChanged` e qualsiasi sync globale
  - introdurre `TasksProvider` e `useTasks` con invalidazione locale esplicita
  - assistant shell invalida tasks/calendar tramite API del provider, non tramite eventi

- Timer:
  - creare `app/_features/timer/index.ts`
  - spostare `TimerContext`, `TimerDisplay`, `timerManager`
  - isolare update loop del timer nel feature timer

### Fase 4. Migrare chats e memory lato server

- Chats:
  - spostare repository/service/schema/dto/handler in `app/_features/chats/server`
  - route `/api/chats` resta solo parse-request -> call handler -> map response
  - usare result type standardizzati e validazione Zod per query/body

- Memory:
  - creare `app/_features/memory/index.ts`
  - strutturare `server/episodic` e `server/semantic`
  - per ciascuno: `schemas.ts`, `service.ts`, `repository.ts`, `dto.ts`, `handlers.ts`
  - spostare anche i search handler sotto la stessa feature
  - route memory diventano completamente sottili

### Fase 5. Rifare l’assistant come feature reale

- Spostare la UI assistant in componenti distinti:
  - `AssistantShell`
  - `AssistantStatus`
  - `AssistantClock`
  - `AssistantPanels`
  - `AssistantActions`
  - `FloatingChat`
  - `MessageList`
  - `ChatInput`
- Spezzare `ChatbotPageClient` in orchestratore leggero + sottocomponenti.
- Introdurre una session machine pura sotto `assistant/lib`.
- Spostare storage/compaction/config/transport/audio nel feature assistant.
- Spostare tool definitions e system tools sotto `assistant/tools`.
- Nessun tool riceve più `Record<string, unknown>` come contratto effettivo dopo il parse:
  - parse/validate
  - normalizzazione
  - execute con argomenti tipizzati
- Mantenere un solo punto pubblico: `@/app/_features/assistant`.

### Fase 6. Pulizia finale e rimozione totale legacy

- Eliminare definitivamente:
  - `app/components/**`
  - `app/hooks/**`
  - `app/lib/calendar/**`
  - `app/lib/tasks/**`
  - `app/lib/todo/**`
  - `app/lib/timer/**`
  - `app/lib/voice-chat/**`
  - `app/lib/speech/**`
  - `app/lib/supabase/**`
  - `app/lib/embeddings/**`
  - `app/lib/llm/**`
  - `app/api/*/functions.ts`
  - `app/api/*/model.ts`
- Aggiornare README alla nuova topologia reale.
- Rimuovere ogni commento/documentazione che riferisce atoms/molecules/organisms o vecchi path.
- Verificare con grep che non esistano più import legacy.

## Important changes to public APIs, interfaces and types

- Nuova API pubblica interna di import:
  - `@/app/_features/assistant`
  - `@/app/_features/auth`
  - `@/app/_features/calendar`
  - `@/app/_features/chats`
  - `@/app/_features/memory`
  - `@/app/_features/tasks`
  - `@/app/_features/timer`
  - `@/app/_shared`
  - `@/app/_server`
- Rimossi tutti gli export pubblici da:
  - `@/app/components`
  - `@/app/hooks`
  - `@/app/lib/*`
- I tipi `Todo`, `Message`, tool schema, DTO chats/memory/calendar/tasks vengono ricollocati sotto feature o `_shared` e non sono più accessibili dai vecchi path.
- `middleware.ts` viene sostituito da `proxy.ts`.
- Le route Next restano route entrypoint; la logica business non vive più in `route.ts`.

## Test cases e scenari

- Test di boundary:
  - falliscono import da path legacy
  - falliscono deep import cross-feature
- Test unitari assistant:
  - session machine `idle`, `wake_word`, `connected`, `deleteChat`, `switchToChat`, `disableAssistant`
  - parser/normalizer tool con array, enum, nested object e payload invalidi
- Test unitari calendar/tasks/chats/memory:
  - schema Zod query/body
  - handler mapping errori `400/401/404/500`
  - mapper e DTO
- Test integration-light:
  - service calendar con provider Google mockato
  - service tasks con provider Google mockato
  - service chats con repository Supabase mockato
  - service memory semantic/episodic con repository e embeddings mockati
- Test UI mirati:
  - `AssistantShell` coordina invalidazione calendar/tasks senza eventi globali
  - timer e clock aggiornano solo i loro subtree
- Verifiche finali obbligatorie:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
  - `rg \"@/app/components|@/app/hooks|@/app/lib\" app` deve restituire zero risultati applicativi
  - `find app/components app/hooks app/lib -type f` deve fallire o non trovare file legacy rimasti

## Assunzioni e default scelti

- Anche se la rottura di URL esterni è ammessa, il piano non rinomina pagine o endpoint se non necessario: il problema da risolvere è la topologia dei moduli, non il naming delle route pubbliche.
- Il punto canonico di import pubblico è il root entrypoint della feature, non il path diretto del file.
- Non verrà mantenuto nessun bridge temporaneo: ogni move è atomico e distrugge il path precedente.
- `_server/ai` è introdotto come adattamento necessario perché `embeddings` e `llm` sono server-only e non appartengono a una singola feature.
- `speech-recognition.d.ts` verrà spostato in `_shared/types` o nella root type area comune, ma non resterà sotto un path legacy.
- Se durante la migrazione emerge codice morto o superfluo, va eliminato invece di essere ricollocato.
