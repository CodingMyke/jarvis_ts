# Refactor strutturale del progetto in branch separato

## Summary
- Lavoro sul branch dedicato `refactor/app-architecture-cleanup`, con commit atomici per fase.
- Punto di partenza attuale da stabilizzare prima del refactor: `eslint` fallisce, `tsc --noEmit` fallisce, non esiste una suite test, e la complessità è concentrata in `useVoiceChat`, `google-calendar.provider`, route API monolitiche e tool schema tipizzati in modo incompleto.
- End-state deciso: mantenere `app/` come root del progetto, ma introdurre cartelle private interne per separare chiaramente route, feature, shared e server code.

## Architettura target
```text
app/
  api/
  _features/
    assistant/
      hooks/
      lib/
      tools/
      ui/
      types/
    calendar/
      lib/
      server/
      ui/
      types/
    tasks/
      lib/
      server/
      ui/
      types/
    chats/
      lib/
      server/
      types/
    memory/
      lib/
      server/
      types/
    timer/
      lib/
      ui/
      types/
    auth/
      lib/
      ui/
      types/
  _shared/
    ui/
    lib/
    types/
    schemas/
  _server/
    auth/
    http/
    supabase/
```

## Piano di lavoro
1. Baseline e guardrail
- Aggiungere gli script `typecheck`, `test` e `test:watch` a `package.json`.
- Introdurre Vitest con configurazione minima orientata a test unitari e integration-light.
- Portare il progetto in stato green su lint e typecheck prima di spostare file: sistemare il tipo `ParameterProperty`, le dichiarazioni `speech-recognition`, gli `any` bloccanti e gli unused/typing issues che impediscono la baseline.
- Stabilire il baseline di verifica finale: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

2. Separazione strutturale di cartelle e boundary
- Lasciare in `app/` solo route, page, layout e entrypoint Next.
- Spostare il codice riusabile da `app/components`, `app/hooks` e `app/lib` dentro `app/_features`, `app/_shared` e `app/_server`.
- Eliminare la distinzione atoms/molecules/organisms come struttura primaria: la UI diventa feature-first, con primitive condivise in `app/_shared/ui`.
- Mantenere l’alias `@/*`, ma aggiornare tutti gli import per usare entrypoint di feature o shared, evitando deep import arbitrari.
- Introdurre regole ESLint di boundary con `no-restricted-imports` per impedire import diretti tra internals di feature diverse.

3. Consolidamento server/API
- Estrarre logica comune di auth, parsing, error mapping e response building da route come `app/api/chats/route.ts` e `app/api/calendar/events/route.ts` in `app/_server/http`.
- Rendere tutte le route sottili: parse request, chiamata a service, mapping della response.
- Portare ogni feature server-side a una struttura coerente `schemas -> service -> provider/repository -> dto mapper`.
- Per `calendar`, spezzare `app/lib/calendar/google-calendar.provider.ts` in auth/token refresh, client HTTP Google, mapper, provider.
- Per `tasks`, separare route, schema, service e provider Google Tasks.
- Per `chats` e `memory`, separare repository Supabase, service applicativi, DTO e validazione.

4. Refactor del dominio assistant/voice chat
- Spezzare `app/hooks/useVoiceChat.ts` in:
  - facade hook pubblico
  - session state machine pura
  - persistenza conversazione
  - lifecycle wake-word
  - transport Gemini/client
  - side effects dei tool
- Spezzare `app/lib/voice-chat/client/voice-chat.client.ts` in coordinatore audio, dispatcher tool, transport provider e session config builder.
- Spostare le definizioni tool sotto `app/_features/assistant/tools` con parser/normalizer puri e schema condiviso.
- Cambiare il contratto interno dei tool: niente più `Record<string, unknown>` grezzo dopo il parse; ogni tool riceve argomenti tipizzati e validati.
- Correggere la tipizzazione del sistema schema tool in `app/lib/voice-chat/types/tools.types.ts` usando un sottoinsieme ricorsivo di JSON Schema che supporti `array.items`, nested object e `enum`.

5. Pulizia presentation layer e performance runtime
- Spezzare `app/components/organisms/ChatbotPageClient.tsx` in shell, status, clock, panels e actions.
- Sostituire i refresh/eventi ad hoc con hook/provider feature-locali per tasks e calendar; rimuovere il coupling tramite `window.dispatchEvent` da `app/components/organisms/TodoContext.tsx`.
- Isolare timer e clock in componenti che aggiornano solo se stessi, senza trascinare re-render del container assistant.
- Mantenere inizializzazione lazy delle parti audio/voice e spostarla dietro interazione esplicita o wake word.
- Ridurre churn di stato e side effect nel client, spostando logica non UI in moduli puri o server-side.
- Fare una passata di bundle/runtime performance sui punti caldi evidenti, non introdurre librerie globali di state management o data fetching.

6. Hardening finale
- Rimuovere dead code, debug log, export non usati e documentazione non più coerente.
- Aggiornare `README.md` con nuova struttura, workflow e script.
- Fare pass finale su lint, typecheck, test e build.

## Cambiamenti importanti a API, interfacce e tipi
- Nuovi script pubblici di progetto: `typecheck`, `test`, `test:watch`.
- Introduzione di Zod per request schema e parse dei payload interni.
- Sostituzione di `ParameterProperty` con un tipo schema ricorsivo compatibile con array e oggetti annidati.
- Standardizzazione dei result type interni di service e route handler.
- Path degli endpoint `app/api/*` invariati.
- Consentite modifiche comportamentali locali su validazione e gestione errori: input invalidi devono diventare `400`, auth `401`, errori di configurazione/mutazioni non devono più passare come `200` ambiguo se il chiamante è interno e aggiornabile nel branch.

## Test cases e scenari
- Unit test per parser/schema dei tool assistant, inclusi casi con array (`texts`, `attendees`) e payload invalidi.
- Unit test per session machine assistant: `idle`, `wake_word`, `connected`, `deleteChat`, `switchToChat`, `disableAssistant`.
- Unit test per validator di route `calendar`, `tasks`, `chats`, `memory`.
- Unit test per mapper e helper puri: parsing date, mapping Google event, compaction/summarization helpers.
- Integration-light con dependency mocking per service `calendar`, `tasks`, `chats`, `memory`.
- Smoke test dei route handler principali con dipendenze mockate.
- Nessuna suite UI estesa o snapshot test in questo refactor.

## Assunzioni e default
- Branch unica lunga dedicata al refactor; nessun lavoro su `main`.
- Refactor strutturale aggressivo ma senza cambiare URL delle pagine o i path degli endpoint.
- Sono ammessi fix funzionali locali quando servono a rimuovere incoerenze o fragilità emerse dal refactor.
- Test coverage minima ma mirata ai punti critici del refactor, non alla copertura completa della UI.
- Nessuna nuova libreria di state management globale; si usano hook/context feature-locali e moduli puri.
- Dipendenze nuove consentite solo se strettamente necessarie al refactor: `vitest`, `zod`, ed eventuali helper `server-only`/`client-only`.
