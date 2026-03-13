# Piano: eliminazione evento dalla UI solo nella vista estesa

## Sintesi
Aggiungere un'azione di eliminazione direttamente nella card evento solo quando l'evento e espanso (`isExpanded === true`), senza toccare la visualizzazione compatta. L'azione usera la route gia esistente `DELETE /api/calendar/events?eventId=...`, mostrera una conferma modale coerente con il pattern gia usato per `FloatingChat`, rimuovera subito l'evento dallo stato client e fara poi un refresh silenzioso per riallineare la UI al provider.

## Ambito e criteri di successo
- Il pulsante "elimina" non deve comparire nella card collassata.
- Il pulsante deve comparire solo nella card evento espansa.
- Al click si apre un modal di conferma.
- Alla conferma:
  - la UI mostra stato pending e blocca doppi submit
  - chiama la route `DELETE` esistente
  - se l'operazione va a buon fine, l'evento sparisce subito dalla lista
  - se quel giorno non ha piu eventi, il gruppo giorno viene rimosso
  - la card viene richiusa
  - parte un refresh silenzioso per riconciliare eventuali latenze/provider mismatch
- In caso di errore:
  - l'evento resta visibile
  - il modal resta aperto
  - compare un messaggio di errore locale, non un errore globale della sessione voce

## Implementazione decisa

### 1. Riutilizzare il flusso dati gia esistente in `ChatbotPageClient`
File coinvolti:
- `app/_features/assistant/ui/ChatbotPageClient.tsx`
- `app/_features/assistant/ui/AssistantShell.tsx`
- `app/_features/assistant/ui/AssistantPanels.tsx`

Decisioni:
- `ChatbotPageClient` resta il source of truth dello stato `events`.
- Aggiungere un callback async `onDeleteEvent(eventId)` che:
  - chiama la route `DELETE`
  - aggiorna lo stato locale rimuovendo l'evento
  - lancia `refreshEvents()` con piccolo delay come gia avviene per i tool calendario
  - ritorna un risultato standardizzato `{ success: boolean; errorMessage?: string }`
- Passare questo callback via props fino a `UpcomingEvents`.

Motivo:
- evita nuovo state management
- resta coerente con l'attuale refresh silenzioso usato dopo i tool vocali
- minimizza il rischio di divergenza con il comportamento gia presente

### 2. Gestire la rimozione locale in modo deterministico
File coinvolti:
- `app/_features/calendar/lib/actions.ts` oppure nuovo helper piccolo in `app/_features/calendar/lib/`
- `app/_features/assistant/ui/ChatbotPageClient.tsx`

Decisioni:
- Estrarre una funzione pura per rimuovere un evento da `UIDayEvents[]`.
- La funzione deve:
  - filtrare l'evento dal giorno corretto
  - eliminare i gruppi giorno rimasti vuoti
  - restituire sempre nuovi riferimenti immutabili

Motivo:
- rende la logica testabile in ambiente Vitest `node`
- evita manipolazioni inline piu fragili dentro il componente

### 3. Aggiungere il pulsante solo nella card evento espansa
File coinvolti:
- `app/_features/calendar/ui/EventItem.tsx`
- `app/_features/calendar/ui/DayEvents.tsx`
- `app/_features/calendar/ui/UpcomingEvents.tsx`

Decisioni:
- Introdurre in `EventItem` una prop async `onDeleteEvent?: (eventId: string) => Promise<{ success: boolean; errorMessage?: string }>`
- Renderizzare il pulsante elimina solo quando `isExpanded` e `true`
- Posizionarlo nell'area dettagli espansi, vicino al footer/ID, non nell'header compatto
- Riutilizzare l'icona trash gia disponibile in `_shared` se presente, altrimenti usare SVG inline gia in linea col codice

Dettagli comportamentali:
- click sul pulsante deve fare `stopPropagation()` per non richiudere o ritoggare la card
- `UpcomingEvents` deve wrappare `onDeleteEvent` per chiudere `expandedEventId` se la cancellazione va a buon fine

### 4. Conferma modale coerente con la UX esistente
File coinvolti:
- `app/_features/calendar/ui/EventItem.tsx`
- riferimento UX: `app/_features/assistant/ui/FloatingChat.tsx`

Decisioni:
- Implementare un piccolo modal locale nello stesso `EventItem`, senza introdurre nuova libreria
- Struttura:
  - titolo "Elimina evento"
  - testo con il titolo evento
  - CTA secondaria "Annulla"
  - CTA primaria distruttiva "Elimina evento"
- Durante `isDeleting`:
  - disabilitare entrambe le CTA
  - mostrare testo di loading sulla CTA primaria
- In caso di errore:
  - mostrare messaggio inline dentro il modal
  - lasciare il modal aperto per retry o annulla

Motivo:
- pattern gia presente nel progetto
- evita dipendenze nuove
- protegge da eliminazioni accidentali

### 5. Chiamata API di cancellazione
File coinvolti:
- `app/_features/assistant/ui/ChatbotPageClient.tsx`
- route invariata: `app/api/calendar/events/route.ts`

Decisioni:
- Non modificare la route server ne gli schema Zod: il contratto gia basta.
- Aggiungere helper client locale, sul modello di `fetchCalendarEventsFromAPI`, per:
  - fare `fetch(url, { method: "DELETE" })`
  - leggere `errorMessage` dalla response quando presente
  - restituire un esito tipizzato consumabile dalla UI

Motivo:
- scope contenuto
- nessun cambiamento ai contratti HTTP pubblici

## Interfacce e tipi da aggiungere o aggiornare
Nessuna modifica all'API pubblica server.

Modifiche interne previste:
- `AssistantShellProps`: aggiungere `onDeleteEvent`
- `AssistantPanelsProps`: aggiungere `onDeleteEvent`
- `UpcomingEventsProps`: aggiungere `onDeleteEvent`
- `DayEventsProps`: aggiungere `onDeleteEvent`
- `EventItemProps`: aggiungere `onDeleteEvent`
- Introdurre un tipo interno UI, ad esempio:
  - `type DeleteCalendarEventUiResult = { success: boolean; errorMessage?: string }`

## Edge case e failure mode coperti
- Click su elimina mentre la card e espansa non deve collassare la card.
- Click fuori dalla card non deve interferire con il modal aperto.
- Doppio click su "Elimina evento" non deve generare due richieste.
- Eliminazione dell'ultimo evento del giorno deve rimuovere anche l'intestazione del giorno.
- Se il provider risponde errore o token scaduto, la UI deve mostrare il messaggio locale e non alterare la lista.
- Se il refresh successivo restituisce dati diversi da quelli ottimistici, prevale il refresh.
- Nessuna gestione speciale per serie/ricorrenze: la UI usa il comportamento attuale del provider dato l'`eventId` ricevuto.

## Test automatici
File previsto:
- nuovo test puro in `app/_features/calendar/lib/*.test.ts`

Casi da coprire:
- rimozione di un evento da un giorno con altri eventi residui
- rimozione dell'unico evento del giorno con eliminazione del gruppo
- rimozione di `eventId` inesistente senza alterare i dati
- ritorno di nuovi riferimenti immutabili

## Verifiche manuali
- Evento collassato: nessun pulsante elimina visibile.
- Evento espanso: pulsante elimina visibile.
- Apertura/chiusura modal da pulsante e da overlay.
- Conferma riuscita: evento sparisce subito, card chiusa, eventuale giorno vuoto rimosso.
- Conferma fallita: evento resta, compare errore nel modal, retry possibile.
- Dopo delete da UI, un refresh tool-driven successivo continua a funzionare correttamente.
- Nessuna regressione nel toggle espandi/chiudi e nello scroll compensato di `UpcomingEvents`.

## Assunzioni e default scelti
- "Visualizzazione estesa" significa la card singola evento nello stato espanso gia esistente in `app/_features/calendar/ui/EventItem.tsx`.
- La conferma richiesta sara un modal, non una cancellazione immediata.
- Non verranno introdotte nuove librerie UI o toast.
- La route `DELETE /api/calendar/events` resta invariata.
- Il feedback errore resta locale alla feature evento, non nel banner globale dell'assistente.
- Se durante l'implementazione viene toccato `app/_features/calendar/ui/UpcomingEvents.tsx`, va rimosso anche il `console.log` di debug presente ora.
