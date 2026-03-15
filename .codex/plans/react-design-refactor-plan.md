# Refactor React completo con `app/design`, Atomic Design e domain stores simmetrici

## Summary
- Obiettivo: rifondare la parte React da zero come organizzazione, non ripulire semplicemente la struttura attuale.
- Tutti i componenti React applicativi vengono centralizzati in `app/design`.
- La UI viene organizzata con Atomic Design.
- I dati di dominio che hanno lo stesso ruolo UX e funzionale vengono modellati in modo simmetrico.
- `tasks` e `calendar` diventano entrambi domain stores; i context locali si usano solo per stato UI confinato a un subtree.
- Nessun mega-store di schermata assistant.

## Principi architetturali
- `app/design` contiene tutti i componenti React non vincolati dal file-system routing.
- `app/_features` contiene logica di dominio, hook, store, adapter API, trasformazioni, tipi, schema, orchestrazione.
- `app/_shared` contiene tipi condivisi e barrel compatibili, non la sorgente primaria dei componenti React.
- Atomic Design applicato come struttura primaria della UI.
- La classificazione per dominio viene mantenuta dentro ciascun livello atomico, così non si perde il contesto di feature.

## Struttura target
```text
app/design/
  atoms/
    shared/
    assistant/
    calendar/
    tasks/
    timer/
    auth/
  molecules/
    shared/
    assistant/
    calendar/
    tasks/
    timer/
    auth/
  organisms/
    assistant/
    calendar/
    tasks/
    timer/
    auth/
  templates/
    assistant/
    auth/
    settings/
  index.ts

app/_features/
  assistant/
    hooks/
    lib/
    types/
  calendar/
    hooks/
    lib/
    state/
    types/
  tasks/
    hooks/
    lib/
    state/
    types/
  timer/
    hooks/
    lib/
    state/
    types/
  auth/
    hooks/
    lib/
```

## Regole obbligatorie
- Un componente esportato per file.
- Un custom hook per file.
- Nessun hook custom definito nello stesso file del componente esportato.
- Nessun componente con più responsabilità miste.
- Hook e context locali al subtree devono stare accanto all'organism o template che li usa in `app/design`, non in `_features`.
- Hook, store e helper di dominio condivisi devono stare in `app/_features/<domain>`.
- Niente prop drilling oltre ciò che resta chiaramente leggibile in 1-2 passaggi.
- Se lo stato interessa solo un organismo/template e i suoi figli: context locale.
- Se lo stato rappresenta un dominio o una collezione condivisa e mutata da più punti: store Zustand.
- `tasks` e `calendar` devono seguire lo stesso pattern architetturale.

## Modello di stato
- `calendar`: store Zustand di dominio.
  - stato: `days`, `status`, `error`, `initialized`.
  - azioni: `initialize`, `refresh`, `removeEvent`, `applyEventMutationResult`.
  - responsibility: cache client del calendario per la schermata assistant e futuri consumer UI.
- `tasks`: store Zustand di dominio.
  - stato: `todos`, `status`, `error`, `initialized`.
  - azioni: `initialize`, `refresh`, `create`, `update`, `remove`, `clearCompleted`.
- `timer`: store Zustand di dominio.
  - stato: `timer`.
  - azioni: `pause`, `resume`, `stop`, `stopNotificationSound`.
  - source: subscription a `timerManager`.
- `assistant voice/chat`: niente store globale dedicato salvo bisogno reale cross-feature.
  - resta orchestrato via `useVoiceChat` e, dove serve, context locali di template/organism.

## Context locali previsti
- `AssistantTemplateContext`
  - solo se dopo lo split restano molte informazioni locali condivise tra organismi assistant.
  - contiene esclusivamente stato di composizione UI locale al template.
  - vive dentro il folder del template assistant in `app/design/templates/assistant`.
- `FloatingChatContext`
  - `isExpanded`, hover, dialog delete, azioni UI correlate.
  - vive nel folder dell'organism `FloatingChat` in `app/design/organisms/assistant`.
- `CalendarPanelContext`
  - `expandedEventId`, scroll offset, dialog/selection locali al pannello.
  - vive nel folder dell'organism `CalendarPanel` in `app/design/organisms/calendar`.
- Eventuali altri context solo per subtree con responsabilità unica.

## Atomic mapping iniziale
- `atoms/shared`: `Button`, icone, piccoli indicatori, shell base pannello, chip, divider.
- `atoms/assistant`: indicatori minimi assistant, orb ring layer, message role badge.
- `atoms/calendar`: event dot, time label, event tag.
- `atoms/tasks`: todo checkbox, count badge.
- `atoms/timer`: progress bar segment, timer icon wrapper.

- `molecules/assistant`: `AssistantStatusBlock`, `ChatHeader`, `ChatMessageMeta`, `MicrophoneControl`.
- `molecules/calendar`: `EventItemHeader`, `EventItemDetails`, `EventDeleteActions`.
- `molecules/tasks`: `TodoItem`, `TodoListHeader`.
- `molecules/timer`: `TimerControls`, `TimerReadout`.
- `molecules/auth`: `LoginCard`, `SettingsSectionHeader`.

- `organisms/assistant`: `FloatingChat`, `VoiceOrbPanel`, `AssistantStatusPanel`.
- `organisms/calendar`: `CalendarPanel`, `UpcomingEventsList`.
- `organisms/tasks`: `TodoPanel`.
- `organisms/timer`: `TimerPanel`.
- `organisms/auth`: `LoginPanel`, `SettingsPanel`.

- `templates/assistant`: `AssistantWorkspaceTemplate`.
- `templates/auth`: `LoginTemplate`.
- `templates/settings`: `SettingsTemplate`.

## Sequenza di refactor
1. Creare la struttura `app/design` con livelli atomici e barrel interni.
2. Spostare i componenti shared React da `app/_shared/ui` a `app/design/atoms/shared` o `molecules/shared` secondo responsabilità.
3. Creare `calendar.store.ts`, `tasks.store.ts`, `timer.store.ts` in `_features/*/state`.
4. Eliminare `TodoProvider` e `TimerProvider`.
5. Introdurre bootstrap client per inizializzare i domain stores da dati SSR.
6. Cambiare `app/assistant/page.tsx` per passare `initialEvents` e `initialTodos` al template client senza provider annidati.
7. Rifattorizzare `ChatbotPageClient.tsx` in un template assistant sottile che:
   - inizializza store `calendar` e `tasks`,
   - collega `useVoiceChat`,
   - distribuisce stato locale tramite context di template solo se serve,
   - compone organismi.
8. Estrarre tutta la logica helper da `ChatbotPageClient` in `_features/assistant/lib` e `_features/calendar/lib`.
9. Rifattorizzare `FloatingChat` come organismo con context locale e sottocomponenti separati; hook e context locali restano nel folder dell'organism.
10. Rifattorizzare `VoiceOrb` come organismo con hook dedicati esterni, colocati nel folder dell'organism se non riusati altrove.
11. Rifattorizzare `calendar` da zero come sottosistema parallelo a `tasks`:
   - organismo `CalendarPanel`,
   - organism/list per giorni/eventi,
   - local context per espansione evento e scrolling colocato nel subtree calendar,
   - store di dominio per dati evento.
12. Rifattorizzare `tasks` con pattern equivalente:
   - organismo `TodoPanel`,
   - molecules per item/header,
   - store di dominio per dati todo.
13. Rifattorizzare `timer` come domain store + organismo `TimerPanel`.
14. Spostare auth UI sotto `app/design/auth`.
15. Aggiornare tutti i barrel di feature per re-esportare i componenti da `app/design`.
16. Eliminare definitivamente `app/_features/*/ui` e `app/_shared/ui`.

## Cambi pubblici / interfacce
- `ChatbotPageClientProps` diventa almeno:
  - `initialEvents: UIDayEvents[]`
  - `initialTodos: Todo[]`
- `_features/tasks` smette di esportare `TodoProvider`; esporta `useTasksStore` e bootstrap helpers.
- `_features/calendar` esporta `useCalendarStore` e helper di bootstrap.
- `_features/timer` esporta `useTimerStore`.
- I barrel pubblici mantengono i nomi dei componenti già usati dalle pagine, ma la loro implementazione reale vive in `app/design`.

## Test e scenari
- Test store `tasks`:
  - bootstrap SSR
  - refresh
  - create/update/delete
  - errore API
- Test store `calendar`:
  - bootstrap SSR
  - refresh
  - remove/update event
  - side effect tool execution
  - errore API
- Test store `timer`:
  - subscription manager
  - pause/resume/stop
- Test helper estratti:
  - mapping evento API -> UI
  - grouping day events
  - timer format/smoothing helpers puri
- Smoke test UI manuali:
  - login
  - chat live
  - refresh pannello tasks dopo tool
  - refresh pannello calendar dopo tool
  - delete chat
  - pause/resume timer
  - settings

## Criteri di accettazione
- Tutti i componenti React applicativi stanno in `app/design`.
- `tasks` e `calendar` sono strutturati allo stesso livello concettuale e con lo stesso pattern dati/UI.
- Gli store Zustand sono usati per domini condivisi, non come scorciatoia contro il prop drilling.
- I context sono locali e limitati a subtree con responsabilità singola.
- Nessun custom hook non banale nello stesso file del componente esportato.
- Hook e context locali sono colocati nel subtree React che li usa.
- Nessun componente grande contiene hook interni, sottocomponenti multipli importanti e logica dati nello stesso file.
- Le pagine App Router restano sottili.

## Assunzioni e default
- `zustand` viene aggiunta come dipendenza runtime.
- Atomic Design viene usato come struttura primaria della cartella `app/design`.
- La simmetria tra `tasks` e `calendar` è una regola di progetto, non solo una conseguenza dell’implementazione corrente.
- Nessun cambiamento ai contratti delle API server in questo passaggio.
