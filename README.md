# Jarvis AI - Assistente Vocale Interattivo

Assistente vocale AI in tempo reale basato su **Google Gemini Live API**, con wake word, function calling (calendario, todo, timer, memorie) e autenticazione Google + Supabase.

## Caratteristiche principali

- **Voice chat real-time**: streaming bidirezionale con Gemini Live API (WebSocket), bassa latenza e interruzioni naturali (barge-in)
- **Wake word**: ascolto locale fino al rilevamento della parola chiave (es. "Jarvis"), poi connessione a Gemini
- **Trascrizioni live**: testo in tempo reale di input e output
- **Function calling**: strumenti integrati per azioni concrete
  - **Calendario**: eventi Google Calendar (crea, modifica, elimina, elenco)
  - **Todo**: Google Tasks (crea, modifica, elimina, elenco)
  - **Timer**: avvio, pausa, ripresa, stop, stato
  - **Memorie**: ricordi episodici e semantici (Supabase), creazione/aggiornamento/ricerca/eliminazione
  - **Controllo sessione**: fine conversazione, cancellazione chat, disattivazione assistente
- **Persistenza conversazione**: salvataggio in localStorage, riassunto oltre soglia, caricamento history
- **Autenticazione**: Google OAuth tramite Supabase; API memorie/calendario/tasks protette da sessione
- **UI**: componenti atomic design, chat con markdown, orb vocale, dark mode, pagine assistant/settings/setup

## Stack tecnologico

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5, Tailwind CSS 4
- **Voice**: Google Gemini Live API (`@google/genai`)
- **Auth e DB**: Supabase (auth, tabelle `episodic_memory`, `semantic_memory`)
- **Integrazioni**: Google Calendar, Google Tasks (OAuth server-side)
- **Rendering messaggi**: react-markdown, remark-gfm

## Prerequisiti

- Node.js 20+
- Browser moderno con supporto Web Audio API e WebSocket
- Microfono e permessi browser
- Account Google (per auth e, opzionalmente, Calendar/Tasks)
- Chiave API Gemini e progetto Supabase configurati

## Installazione

1. Clona il repository e entra nella cartella:
   ```bash
   git clone <repository-url>
   cd jarvis_ts
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Configura le variabili d'ambiente (`.env.local`):
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   Per Calendar e Tasks vedi `app/lib/calendar/GOOGLE_CALENDAR_SETUP.md` e `app/lib/tasks/GOOGLE_TASKS_SETUP.md`.

4. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

5. Apri [http://localhost:3000](http://localhost:3000).

## Utilizzo

1. **Login**: accedi con Google (necessario per memorie, calendario e tasks).
2. **Avvio**: clicca sull’orb del microfono; l’assistente resta in ascolto locale per la parola chiave.
3. **Attivazione**: pronuncia "Jarvis" (o il wake word configurato); si stabilisce la connessione a Gemini e puoi parlare e ricevere risposte vocali.
4. **Comandi**: puoi chiedere di creare/modificare eventi, todo, timer, salvare ricordi, cercare nelle memorie, ecc. L’assistente usa i tool in automatico.
5. **Fine conversazione**: di’ esplicitamente che hai finito (es. "ciao", "grazie a dopo") per far chiamare il tool di fine conversazione; oppure chiedi di "tapparti le orecchie" per disattivare l’assistente.

## Struttura del progetto

```
jarvis_ts/
├── app/
│   ├── api/                    # Route API
│   │   ├── auth/                # Google OAuth callback
│   │   ├── calendar/            # Eventi Google Calendar
│   │   ├── memory/              # episodic/ e semantic/ (CRUD + search)
│   │   └── tasks/               # Google Tasks
│   ├── components/              # Atomic design
│   │   ├── atoms/               # Button, VoiceOrb, Icons, EventItem
│   │   ├── molecules/           # ChatBubble, MicrophoneButton, AuthButton
│   │   └── organisms/           # ChatbotPageClient, MessageList, FloatingChat, ecc.
│   ├── hooks/
│   │   ├── useVoiceChat.ts      # Voice chat (Gemini Live + wake word + storage)
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── voice-chat/          # Client, provider Gemini, audio, tools, storage
│   │   ├── supabase/            # Auth e client DB
│   │   ├── calendar/            # Google Calendar provider
│   │   ├── tasks/               # Google Tasks provider
│   │   ├── embeddings/          # Gemini embeddings (ricerca memorie)
│   │   ├── timer/               # Timer manager
│   │   └── speech/              # Tipi messaggi
│   ├── assistant/               # Pagina assistente
│   ├── settings/                # Impostazioni
│   └── setup/                   # Setup Calendar/Tasks
├── public/
│   └── audio-capture-processor.worklet.js
├── Description.md               # Specifiche tecniche per LLM
└── README.md
```

## Script

```bash
npm run dev        # Sviluppo
npm run build      # Build produzione
npm run start      # Avvio produzione
npm run lint       # Linter
npm run gen-supabase-types   # Rigenera tipi Supabase
```

## Permessi e sicurezza

- **Microfono**: richiesto per riconoscimento vocale e wake word.
- **HTTPS**: consigliato in produzione (obbligatorio per alcune API browser).
- **API key Gemini**: esposta lato client; in produzione valutare ephemeral tokens.

## Risoluzione problemi

- **Microfono non funziona**: verifica permessi del browser e che l’input sia il dispositivo corretto.
- **Nessuna risposta vocale**: controlla volume e che la chiave Gemini sia valida; verifica in console eventuali errori WebSocket.
- **Memorie/Calendario/Tasks non funzionano**: verifica di essere autenticato e che Supabase/Google siano configurati (vedi documentazione in `app/lib/`).

## Riferimenti

- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)

## Licenza

Progetto privato - Tutti i diritti riservati.
