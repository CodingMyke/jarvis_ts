# Refactor operazioni condivise UI + tool per calendario e task

## Summary

Analisi fatta sul repo:

- Duplicazione confermata:
  - Calendario lettura: `app/_features/calendar/lib/calendar-client.ts` e `app/_features/assistant/tools/definitions/get-calendar-events.tool.ts`
  - Calendario delete: `app/_features/calendar/lib/calendar-client.ts`, `app/design/templates/assistant/useAssistantWorkspace.ts` e `app/_features/assistant/tools/definitions/delete-calendar-event.tool.ts`
  - Task lettura/create/update/delete: `app/_features/tasks/lib/tasks-client.ts` e i tool `app/_features/assistant/tools/definitions/get-todos.tool.ts`, `app/_features/assistant/tools/definitions/create-todo.tool.ts`, `app/_features/assistant/tools/definitions/update-todo.tool.ts`, `app/_features/assistant/tools/definitions/delete-todo.tool.ts`

- Analizzati ma già a posto / fuori scope:
  - Chat delete: già centralizzata in `app/_features/assistant/hooks/useVoiceChat.ts`
  - Timer: già centralizzato su `timerManager`
  - Memory: tool-only, nessuna UI/manual action equivalente
  - Calendar create/update: oggi tool-only; non è un caso UI + tool, quindi non è refactor obbligatorio in questo passaggio

Obiettivo del refactor:

- introdurre un entrypoint unico per ogni operazione realmente condivisa
- lasciare a UI e tool solo la logica di contorno legata al loro contesto
- spostare fetch, parse response, validazione client-side condivisa e normalizzazione errori in feature modules riusabili
- ridurre anche la duplicazione tra schema route e validazione client dove serve davvero

## Architettura target

### 1. Task: creare un vero operation layer condiviso

Trasformare `app/_features/tasks/lib/tasks-client.ts` da helper UI a sorgente unica condivisa da UI e tool.

API target del modulo:

```ts
getTodos(): Promise<GetTodosOperationResult>
createTodos(input: { text: string } | { texts: string[] }): Promise<CreateTodosOperationResult>
updateTodos(
  input:
    | { id: string; text?: string; completed?: boolean }
    | { updates: Array<{ id: string; text?: string; completed?: boolean }> }
): Promise<UpdateTodosOperationResult>
deleteTodos(
  input:
    | { id: string }
    | { ids: string[] }
    | { deleteAll: true }
    | { deleteCompleted: true }
): Promise<DeleteTodosOperationResult>
```

Decisioni:

- nessuna funzione task condivisa deve lanciare errori per errori applicativi normali
- tutte devono restituire union con `success: true | false`
- il modulo deve essere l’unico punto che parla con `/api/tasks`
- il modulo deve fare la validazione condivisa del payload prima del fetch
- la validazione non va importata da `server/`, quindi va estratta in un modulo neutro

Estrarre schema condiviso in un file neutro, ad esempio:

- `app/_features/tasks/lib/task-operation.schemas.ts`

e farlo usare sia da:

- `app/_features/tasks/server/tasks-route.handlers.ts`
- `app/_features/tasks/lib/tasks-client.ts`

`app/_features/tasks/lib/task-operation.schemas.ts` deve contenere la logica ora in `app/_features/tasks/server/tasks-route.schemas.ts`. Il file server può restare come semplice re-export, o venire ridotto a wrapper minimo.

### 2. Calendario: creare un operation layer condiviso per read + delete

Evolvere `app/_features/calendar/lib/calendar-client.ts` in modulo condiviso da UI e tool.

API target del modulo:

```ts
getCalendarEvents(input?: {
  from?: Date;
  to?: Date;
  daysAhead?: number;
}): Promise<GetCalendarEventsOperationResult>

deleteCalendarEvent(input: {
  eventId: string;
}): Promise<DeleteCalendarEventOperationResult>
```

Decisioni:

- `getCalendarEvents` deve restituire sia dati raw utili al tool sia `days` già raggruppati per la UI
- `deleteCalendarEvent` deve essere il punto unico che chiama `/api/calendar/events?eventId=...`
- l’operazione deve normalizzare sempre `error`, `errorMessage`, `status`
- la validazione query/input va condivisa con la route estraendo la parte riusabile fuori da `server/`

Estrarre schema/helper condivisi in un file neutro, ad esempio:

- `app/_features/calendar/lib/calendar-operation.schemas.ts`

Da lì condividere:

- parsing `from/to/daysAhead`
- validazione `eventId`
- eventuale `resolveCalendarRange`

Nota importante:

- `app/_features/calendar/lib/actions.ts` contiene già `createCalendarEvent`, ma è `use server` e non è il punto giusto da riusare da tool/UI client-side
- questo refactor non deve appoggiarsi a quel modulo per il problema corrente

### 3. Refactor dei consumer UI

Task UI:

- `app/_features/tasks/state/tasks.store.ts` deve usare solo il nuovo operation layer
- `refresh/create/update/remove/clearCompleted` devono leggere `result.success`
- lo store mantiene la sua responsabilità UI:
  - setting `status`
  - gestione `error`
  - `refresh()` post-mutation
- lo store non deve più conoscere dettagli HTTP o shape raw delle response

Calendario UI:

- `app/_features/calendar/state/calendar.store.ts` deve usare `getCalendarEvents`
- `app/design/templates/assistant/useAssistantWorkspace.ts` deve usare `deleteCalendarEvent`
- la UI mantiene la sua responsabilità specifica:
  - `applyCalendarMutationResult({ removedEventId })` resta lato UI
  - ottimismo/rimozione locale restano lato UI
  - l’operation layer non aggiorna store

### 4. Refactor dei tool

I tool diventano adapter sottili.

Task tool:

- `app/_features/assistant/tools/definitions/get-todos.tool.ts` chiama `getTodos()`
- `app/_features/assistant/tools/definitions/create-todo.tool.ts` chiama `createTodos(...)`
- `app/_features/assistant/tools/definitions/update-todo.tool.ts` chiama `updateTodos(...)`
- `app/_features/assistant/tools/definitions/delete-todo.tool.ts` chiama `deleteTodos(...)`

Calendario tool:

- `app/_features/assistant/tools/definitions/get-calendar-events.tool.ts` chiama `getCalendarEvents(...)`
- `app/_features/assistant/tools/definitions/delete-calendar-event.tool.ts` chiama `deleteCalendarEvent(...)`

Regola:

- i tool non devono più fare fetch diretto verso `/api/tasks` o `/api/calendar/events`
- i tool mantengono solo:
  - adattamento parametri LLM -> input feature
  - messaggi finali per l’assistente
  - shape `result` richiesta dal tool dispatcher

### 5. Tipi pubblici e interfacce nuove

Aggiungere tipi esportati dai moduli feature client-safe.

Task:

```ts
type OperationError = {
  success: false;
  error: string;
  errorMessage: string;
  status?: number;
};

type GetTodosOperationResult =
  | {
      success: true;
      todos: Todo[];
      count: number;
      completedCount: number;
      pendingCount: number;
    }
  | OperationError;
```

Per create/update/delete mantenere union analoghe con payload già normalizzati:

- `todo`
- `todos`
- `count`
- `requestedCount`
- `failedIds`
- `deletedTodo`
- `deletedTodos`
- `deletedAll`
- `deletedCompleted`

Calendario:

```ts
type GetCalendarEventsOperationResult =
  | {
      success: true;
      events: CalendarApiEvent[];
      days: UIDayEvents[];
      eventCount: number;
      period: {
        from: string;
        to: string;
        daysAhead?: number;
      };
    }
  | OperationError;
```

```ts
type DeleteCalendarEventOperationResult =
  | {
      success: true;
      message?: string;
    }
  | OperationError;
```

Scelta esplicita:

- non cambiare le API HTTP esterne già esistenti
- cambiare solo le API TypeScript interne consumate da UI e tool

## Piano implementativo

### Step 1

Estrarre schemi neutri condivisi per task e calendario.

Output atteso:

- nuovo modulo schema task condiviso
- nuovo modulo schema calendario condiviso
- route handler aggiornati per usare i moduli condivisi
- test schema esistenti riallineati al nuovo path o lasciati come re-export

### Step 2

Implementare operation layer task in `app/_features/tasks/lib/tasks-client.ts` con funzioni e result union nuove.

Output atteso:

- un solo parser errori tasks
- un solo parser response tasks
- copertura di single e batch operations
- zero `throw` per errori applicativi ordinari

### Step 3

Refactor task store e task tools per usare il nuovo operation layer.

Acceptance:

- nessun fetch diretto a `/api/tasks` fuori da `app/_features/tasks/lib/tasks-client.ts`

### Step 4

Implementare operation layer calendario in `app/_features/calendar/lib/calendar-client.ts` con `getCalendarEvents` e `deleteCalendarEvent`.

Output atteso:

- `getCalendarEvents` restituisce sia `events` raw sia `days`
- `deleteCalendarEvent` ritorna result union normalizzato

### Step 5

Refactor calendar store, workspace hook e tool calendario.

Acceptance:

- nessun fetch diretto a `/api/calendar/events` fuori da `app/_features/calendar/lib/calendar-client.ts`

### Step 6

Pulizia finale.

Da fare:

- rimuovere export legacy non più usati come `fetchCalendarEventsFromApi`, `deleteCalendarEventFromApi`, `fetchTasksFromApi`, `createTaskFromApi`, `updateTaskFromApi`, `deleteTaskFromApi`, `clearCompletedTasksFromApi`
- aggiornare import
- controllare che il root export di feature non introduca collisioni inutili

## Test cases e scenari

### Unit test operation layer task

Aggiungere test dedicati per:

- `getTodos` successo
- `getTodos` errore HTTP
- `createTodos` single valido
- `createTodos` batch valido
- `createTodos` payload invalido short-circuit senza fetch
- `updateTodos` single valido
- `updateTodos` batch con `failedIds`
- `deleteTodos` con `id`
- `deleteTodos` con `ids`
- `deleteTodos` con `deleteAll`
- `deleteTodos` con `deleteCompleted`
- `deleteTodos` payload invalido short-circuit senza fetch

### Unit test operation layer calendario

Aggiungere test dedicati per:

- `getCalendarEvents` con `daysAhead`
- `getCalendarEvents` con `from/to`
- `getCalendarEvents` errore HTTP
- `getCalendarEvents` restituisce `events` e `days`
- `deleteCalendarEvent` successo
- `deleteCalendarEvent` `eventId` invalido short-circuit senza fetch
- `deleteCalendarEvent` errore HTTP

### Store test

Aggiornare:

- `app/_features/tasks/state/tasks.store.test.ts`
- `app/_features/calendar/state/calendar.store.test.ts`

Scelta:

- i test store devono mockare il modulo operation layer, non `fetch`
- così i test store restano focalizzati sul comportamento Zustand

### Tool adapter test

Aggiungere test nuovi per i tool rifattorizzati più critici:

- delete calendar event: mapping corretto success/error
- get calendar events: usa `events` dal layer condiviso, non rifà parsing
- create/update/delete/get todos: mapping corretto delle union condivise nel `result` tool

### Verifica repo

Eseguire:

1. `npm run test`
2. `npm run lint`
3. `npm run typecheck`

Se il refactor tocca exports sensibili, aggiungere anche:

4. `npm run build`

## Acceptance criteria

- Esiste un solo punto interno per ogni operazione condivisa UI + tool su calendario/task
- UI e tool non duplicano più fetch, parse response, error normalization e validazione comune
- I comportamenti utente restano invariati:
  - delete evento da UI continua a rimuovere dal pannello
  - tool calendario/task continuano a ricevere gli stessi dati utili
  - refresh automatici dei pannelli restano invariati
- Le route HTTP non cambiano contratto esterno
- Le eccezioni già centralizzate restano intatte: chat delete, timer

## Assunzioni e default scelti

- Scope del refactor: solo casi davvero duplicati tra client/UI e tool oggi presenti nel repo
- Escluso dal passaggio: memory e calendar create/update, perché non hanno una controparte UI/manuale attuale
- Default architetturale: shared operation layer client-safe per feature, non riuso di moduli `use server`
- Default validazione: estrarre schema neutro riusabile fuori da `server/` invece di importare file server-side nel client
- Default compatibilità: mantenere shape delle response tool attuali, facendo il mapping nel tool adapter
- Default testing: spostare i dettagli HTTP nei test del layer condiviso e alleggerire i test store/tool
