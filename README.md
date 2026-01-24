# Jarvis AI - Assistente Vocale Interattivo

Un assistente vocale AI intelligente sviluppato con Next.js e TypeScript, che utilizza le API native del browser per il riconoscimento e la sintesi vocale in italiano.

## 🎯 Caratteristiche Principali

- **Riconoscimento Vocale Continuo**: Utilizza la Speech Recognition API per ascoltare continuamente i comandi vocali
- **Sintesi Vocale Naturale**: Risponde con voce italiana femminile ottimizzata per naturalezza e chiarezza
- **Attivazione con Parola Chiave**: Risponde solo quando viene menzionato "Jarvis" nella frase
- **Interfaccia Chat Moderna**: UI pulita e responsive con supporto dark mode
- **Conversazioni Intelligenti**: Gestisce risposte predefinite e chiusura automatica della conversazione
- **Scroll Automatico**: I messaggi scorrono automaticamente quando la chat si aggiorna

## 🛠️ Stack Tecnologico

- **Framework**: Next.js 16.0.5
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **APIs**: Web Speech API (Speech Recognition & Speech Synthesis)

## 📋 Prerequisiti

- Node.js (versione 20 o superiore)
- Un browser moderno che supporti la Web Speech API (Chrome, Edge, Safari)
- Microfono funzionante e permessi browser abilitati

## 🚀 Installazione

1. Clona il repository:
```bash
git clone <repository-url>
cd jarvis_ts
```

2. Installa le dipendenze:
```bash
npm install
```

3. Avvia il server di sviluppo:
```bash
npm run dev
```

4. Apri [http://localhost:3000](http://localhost:3000) nel tuo browser

## 💬 Come Utilizzare

1. **Avvia la Chat**: Clicca sul pulsante del microfono per iniziare la conversazione
2. **Parla con Jarvis**: Pronuncia "Jarvis" seguito dal tuo comando (es. "Jarvis, ciao")
3. **Ricevi Risposte**: Jarvis risponderà sia visivamente che vocalmente
4. **Termina la Conversazione**: Di' "Jarvis, grazie" per chiudere la chat vocale

### Comandi Supportati

- "ciao" - Saluto iniziale
- "come stai" - Chiede come sta Jarvis
- "chi sei" - Informazioni su Jarvis
- "cosa puoi fare" - Elenco delle funzionalità
- "che tempo fa" - Richiesta meteo
- "che ore sono" - Richiesta orario
- "grazie" / "grazie mille" - Chiude la conversazione
- "buongiorno" / "buonasera" / "buonanotte" - Saluti temporali
- "arrivederci" - Saluto finale

## 🏗️ Struttura del Progetto

```
jarvis_ts/
├── app/
│   ├── hooks/
│   │   └── useVoiceChat.ts      # Hook per gestione chat vocale
│   ├── types/
│   │   └── speech-recognition.d.ts  # Type definitions per Speech API
│   ├── globals.css              # Stili globali con Tailwind
│   ├── layout.tsx               # Layout principale dell'app
│   ├── page.tsx                 # Pagina principale del chatbot
│   └── favicon.ico
├── public/                      # Asset statici
├── package.json                 # Dipendenze e script
├── tsconfig.json               # Configurazione TypeScript
├── next.config.ts              # Configurazione Next.js
├── postcss.config.mjs          # Configurazione PostCSS
├── eslint.config.mjs           # Configurazione ESLint
└── README.md
```

## 🔧 Funzionalità Tecniche

### Hook `useVoiceChat`

Il custom hook gestisce tutta la logica della chat vocale:

- **Gestione Stato**: Recording status, messaggi, riferimenti per recognition e speaking
- **Riconoscimento Vocale**: Configurato per italiano con `continuous: true` e `interimResults: false`
- **Gestione Errori**: Handling completo per errori di rete, permessi, e no-speech
- **Controllo Flusso**: Previene sovrapposizioni tra ascolto e risposta
- **Riavvio Automatico**: Riavvia il recognition dopo ogni risposta vocale

### Caratteristiche UI

- Design responsive e moderno
- Messaggi con stili differenziati (utente vs AI)
- Animazioni smooth per scroll automatico
- Indicatori visivi dello stato di recording
- Supporto dark mode nativo

## 📜 Script Disponibili

```bash
npm run dev      # Avvia il server di sviluppo
npm run build    # Crea build di produzione
npm run start    # Avvia il server di produzione
npm run lint     # Esegue il linter
```

## 🔒 Permessi Richiesti

L'applicazione richiede i seguenti permessi del browser:
- **Accesso al Microfono**: Necessario per il riconoscimento vocale
- **Sintesi Vocale**: Generalmente disponibile senza permessi espliciti

## 🐛 Risoluzione Problemi

### Il microfono non funziona
- Verifica i permessi del microfono nelle impostazioni del browser
- Assicurati di utilizzare HTTPS (obbligatorio per Speech Recognition API)
- Controlla che il microfono sia funzionante e selezionato come input predefinito

### La voce non risponde
- Verifica che il volume del sistema sia attivo
- Controlla che il browser supporti la Speech Synthesis API
- Prova a ricaricare la pagina per reinizializzare le voci disponibili

### Il riconoscimento vocale si interrompe
- Potrebbe essere un problema di connessione di rete (Chrome richiede connessione)
- Verifica la console per errori specifici
- Il sistema si riavvia automaticamente in caso di errore "no-speech"

## 🔮 Sviluppi Futuri

- Integrazione con API AI esterne (OpenAI, Claude, etc.)
- Supporto multilingua
- Memoria conversazionale persistente
- Comandi personalizzabili dall'utente
- Integrazione con servizi esterni (meteo, calendario, etc.)
- Text-to-speech con voci premium
- Analisi del sentiment nelle conversazioni

## 📄 Licenza

Progetto privato - Tutti i diritti riservati

## 🙏 Crediti

Sviluppato con ❤️ utilizzando:
- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
