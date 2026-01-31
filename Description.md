# Jarvis Voice Chat - Gemini Live API Implementation

## Overview per LLM

Questo documento descrive l'implementazione di un sistema di **voice chat real-time bidirezionale** con **Google Gemini Live API**. L'assistente vocale supporta wake word, function calling (calendario, todo, timer, memorie episodiche/semantiche), persistenza conversazione e autenticazione (Google + Supabase).

---

## Stato Implementazione (attuale)

- **Voice chat**: Gemini Live API implementata (WebSocket, audio PCM, trascrizioni, barge-in).
- **Wake word**: ascolto locale con parola chiave configurabile (`jarvis.config.ts`); dopo il wake word si connette a Gemini.
- **Tools**: calendario (Google Calendar), todo (Google Tasks), timer, memorie episodiche e semantiche (Supabase), clearChat, endConversation, disableAssistant.
- **Storage conversazione**: `ConversationStorage` (localStorage), riassunto oltre soglia messaggi, caricamento history al mount.
- **Auth**: Google OAuth + Supabase; API memory/calendar/tasks protette da sessione.
- **UI**: componenti atomic design, `useVoiceChat` con stati connection/listening, FloatingChat, pagine assistant/settings/setup.

---

## Contesto del Progetto

### Stack Tecnologico
- **Framework**: Next.js 16.0.5 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5
- **Styling**: Tailwind CSS 4
- **Voice**: Google Gemini Live API (`@google/genai`)
- **Auth e DB**: Supabase (auth, episodic_memory, semantic_memory)
- **Integrazioni**: Google Calendar, Google Tasks (API server-side)
- **Lingua UI**: Italiano

### Struttura Attuale
```
jarvis_ts/
├── app/
│   ├── api/
│   │   ├── auth/           # Google OAuth callback
│   │   ├── calendar/       # Eventi Google Calendar
│   │   ├── memory/         # episodic/ e semantic/ (CRUD + search)
│   │   └── tasks/          # Google Tasks
│   ├── components/
│   │   ├── atoms/          # Button, VoiceOrb, Icons, EventItem
│   │   ├── molecules/      # ChatBubble, MicrophoneButton, AuthButton, DayEvents
│   │   └── organisms/      # ChatbotPageClient, MessageList, Header, FloatingChat, TodoList, TimerDisplay, ecc.
│   ├── hooks/
│   │   ├── useVoiceChat.ts # Hook voice chat (Gemini Live + wake word + storage)
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── voice-chat/     # Client, provider Gemini, audio, tools, storage
│   │   ├── speech/         # Tipi Message
│   │   ├── supabase/       # Auth, DB, server client
│   │   ├── calendar/       # Google Calendar provider
│   │   ├── tasks/          # Google Tasks provider
│   │   ├── embeddings/     # Gemini embeddings (per search memorie)
│   │   └── timer/          # Timer manager
│   └── types/
├── public/
│   └── audio-capture-processor.worklet.js  # Worklet per cattura microfono
```

---

## Obiettivo Finale

Implementare **Gemini Live API** per ottenere:

1. **Conversazione Real-Time**: Audio streaming bidirezionale via WebSocket
2. **Bassa Latenza**: Risposte immediate, non batch
3. **Interruzioni Naturali (Barge-in)**: L'utente può interrompere l'AI mentre parla
4. **Trascrizioni Live**: Testo in tempo reale di input e output
5. **Function Calling**: Predisposizione per tools esterni (lista inizialmente vuota)
6. **Architettura Modulare**: Possibilità di cambiare provider AI in futuro

---

## Gemini Live API - Specifiche Tecniche

### Endpoint WebSocket
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=API_KEY
```

### Modello Consigliato
```
gemini-2.5-flash-native-audio-preview-12-2025
```

### Formato Audio
- **Input (Microfono → API)**: PCM 16-bit, little-endian, 16kHz, mono
- **Output (API → Speaker)**: PCM 16-bit, little-endian, 24kHz, mono
- **Encoding**: Base64 per trasmissione JSON

### Protocollo Messaggi

#### Client → Server

**1. Setup Message** (primo messaggio dopo connessione)
```typescript
{
  setup: {
    model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore"
          }
        }
      }
    },
    systemInstruction: {
      parts: [{ text: "Sei un assistente vocale italiano..." }]
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false  // VAD server-side abilitato
      }
    },
    tools: []  // Lista vuota, predisposta per futuro
  }
}
```

**2. Realtime Input Message** (streaming audio continuo)
```typescript
{
  realtimeInput: {
    audio: {
      data: "base64_encoded_pcm_audio",
      mimeType: "audio/pcm;rate=16000"
    }
  }
}
```

**3. Activity Signals** (per VAD manuale, opzionale)
```typescript
{ realtimeInput: { activityStart: {} } }
{ realtimeInput: { activityEnd: {} } }
```

**4. Tool Response** (per function calling)
```typescript
{
  toolResponse: {
    functionResponses: [{
      id: "call_id",
      name: "function_name",
      response: { result: "..." }
    }]
  }
}
```

#### Server → Client

**1. Setup Complete**
```typescript
{ setupComplete: {} }
```

**2. Server Content** (audio + trascrizioni)
```typescript
{
  serverContent: {
    modelTurn: {
      parts: [{
        inlineData: {
          mimeType: "audio/pcm",
          data: "base64_audio_chunk"
        }
      }]
    },
    inputTranscription: { text: "cosa hai detto" },
    outputTranscription: { text: "risposta parziale..." },
    turnComplete: false,
    interrupted: false
  }
}
```

**3. Tool Call** (richiesta function calling)
```typescript
{
  toolCall: {
    functionCalls: [{
      id: "call_123",
      name: "web_search",
      args: { query: "meteo roma" }
    }]
  }
}
```

**4. Usage Metadata**
```typescript
{
  usageMetadata: {
    promptTokenCount: 100,
    responseTokenCount: 50,
    totalTokenCount: 150
  }
}
```

---

## Architettura da Implementare

### Diagramma Architetturale
```
┌─────────────────────────────────────────────────────────────┐
│                     React UI Layer                          │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ useVoiceChat │  │ MicButton   │  │ MessageList      │   │
│  └──────┬───────┘  └─────────────┘  └──────────────────┘   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                   lib/voice-chat                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  VoiceChatClient                      │  │
│  │  - Orchestrazione moduli                             │  │
│  │  - Event handling                                    │  │
│  │  - State management                                  │  │
│  └─────────────┬────────────────────────────────────────┘  │
│                │                                            │
│  ┌─────────────┼────────────────────────────────────────┐  │
│  │             ▼                                         │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐    │  │
│  │  │ GeminiProvider  │  │ AudioInputManager       │    │  │
│  │  │ - WebSocket     │  │ - Mic capture           │    │  │
│  │  │ - Messages      │  │ - PCM encoding          │    │  │
│  │  └────────┬────────┘  └─────────────────────────┘    │  │
│  │           │                                           │  │
│  │  ┌────────┴────────┐  ┌─────────────────────────┐    │  │
│  │  │ ToolsRegistry   │  │ AudioOutputManager      │    │  │
│  │  │ - Empty list    │  │ - Audio queue           │    │  │
│  │  │ - Ready for use │  │ - Playback              │    │  │
│  │  └─────────────────┘  └─────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              Gemini Live API (WebSocket)                    │
└─────────────────────────────────────────────────────────────┘
```

### Struttura Directory `lib/voice-chat/` (implementata)

```
lib/voice-chat/
├── index.ts                    # Barrel exports pubblici
├── jarvis.config.ts            # Nome assistente, voce, wake word, system prompt
│
├── types/
│   ├── index.ts
│   ├── client.types.ts         # VoiceChatClientOptions, ConnectionState, VoiceChatError
│   ├── messages.types.ts       # SetupMessage, RealtimeInputMessage, ServerMessage, etc.
│   ├── audio.types.ts          # AudioFormat, AudioChunk, etc.
│   └── tools.types.ts         # ToolDefinition, FunctionCall, FunctionResponse
│
├── config/
│   ├── index.ts
│   ├── default.config.ts       # Config default (modello, sample rate, VAD, trascrizioni)
│   └── voices.config.ts        # GEMINI_VOICES, GeminiVoice
│
├── providers/
│   ├── base.provider.ts        # Interface VoiceChatProvider
│   └── gemini/
│       ├── gemini.provider.ts  # Implementazione WebSocket + messaggi
│       └── gemini-messages.ts  # Builders/parsers messaggi
│
├── audio/
│   ├── audio-input.manager.ts  # Cattura microfono, PCM 16kHz
│   ├── audio-output.manager.ts # Playback PCM 24kHz, queue, clear su interrupt
│   ├── audio-utils.ts          # pcmToBase64, base64ToPcm, float32ToInt16, etc.
│   └── wake-word.manager.ts    # Rilevamento parola chiave locale
│
├── tools/
│   ├── definitions/            # Tool singoli (calendar, todos, timer, memorie, clearChat, endConversation, disableAssistant)
│   ├── system-tools.ts         # Registrazione tools nel client
│   └── types.ts
│
├── storage/
│   ├── conversation-storage.ts # Persistenza localStorage, turns, soglia riassunto
│   ├── summarizer.ts           # Riassunto conversazione (Gemini)
│   └── types.ts
│
└── client/
    └── voice-chat.client.ts    # Orchestrazione provider, audio, tools, eventi
```

---

## Specifiche Moduli

### 1. Types (`lib/voice-chat/types/`)

#### `client.types.ts`
```typescript
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface VoiceChatConfig {
  model: string;
  voice: string;
  language: string;
  systemPrompt?: string;
  responseModalities: ('AUDIO' | 'TEXT')[];
  audioInput: AudioFormat;
  audioOutput: AudioFormat;
  vad: {
    enabled: boolean;
    clientSide: boolean;
  };
  transcription: {
    input: boolean;
    output: boolean;
  };
}

export interface VoiceChatClientOptions {
  provider: VoiceChatProvider;
  config: Partial<VoiceChatConfig>;
  tools?: ToolDefinition[];
  onTranscript?: (text: string, type: 'input' | 'output') => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: VoiceChatError) => void;
  onAudioLevel?: (level: number) => void;
}

export class VoiceChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean
  ) {
    super(message);
  }
}
```

#### `messages.types.ts`
```typescript
// Setup
export interface SessionConfig {
  model: string;
  generationConfig: GenerationConfig;
  systemInstruction?: SystemInstruction;
  tools?: Tool[];
  realtimeInputConfig?: RealtimeInputConfig;
  inputAudioTranscription?: {};
  outputAudioTranscription?: {};
  contextWindowCompression?: { slidingWindow: {} };
}

export interface SetupMessage {
  setup: SessionConfig;
}

// Realtime Input
export interface RealtimeInputMessage {
  realtimeInput: {
    audio?: { data: string; mimeType: string };
    activityStart?: {};
    activityEnd?: {};
    audioStreamEnd?: boolean;
  };
}

// Tool Response
export interface ToolResponseMessage {
  toolResponse: {
    functionResponses: FunctionResponse[];
  };
}

// Server Messages
export interface ServerMessage {
  setupComplete?: {};
  serverContent?: ServerContent;
  toolCall?: ToolCall;
  toolCallCancellation?: { ids: string[] };
  usageMetadata?: UsageMetadata;
  goAway?: { timeLeft: string };
}

export interface ServerContent {
  modelTurn?: {
    parts?: Part[];
  };
  turnComplete?: boolean;
  interrupted?: boolean;
  generationComplete?: boolean;
  inputTranscription?: { text: string };
  outputTranscription?: { text: string };
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  thought?: boolean;
}
```

#### `audio.types.ts`
```typescript
export interface AudioFormat {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
}

export interface AudioInputManagerOptions {
  format: AudioFormat;
  chunkSize: number;
  onChunk: (chunk: AudioChunk) => void;
  onError: (error: Error) => void;
  onLevelChange?: (level: number) => void;
}

export interface AudioOutputManagerOptions {
  format: AudioFormat;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError: (error: Error) => void;
}
```

#### `tools.types.ts`
```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, ParameterProperty>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
}

export interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: {
    result: string;
    error?: string;
  };
}
```

### 2. Providers (`lib/voice-chat/providers/`)

#### `base.provider.ts`
```typescript
export type ProviderEvent = 
  | 'connected'
  | 'disconnected'
  | 'audio'
  | 'transcript'
  | 'toolCall'
  | 'turnComplete'
  | 'interrupted'
  | 'error';

export interface ProviderEventData {
  connected: void;
  disconnected: { reason: string };
  audio: { data: ArrayBuffer };
  transcript: { text: string; type: 'input' | 'output' };
  toolCall: { calls: FunctionCall[] };
  turnComplete: void;
  interrupted: void;
  error: { error: VoiceChatError };
}

export interface VoiceChatProvider {
  readonly name: string;
  
  connect(config: SessionConfig, apiKey: string): Promise<void>;
  disconnect(): void;
  
  sendAudio(data: ArrayBuffer): Promise<void>;
  sendText(text: string): Promise<void>;
  sendActivityStart(): Promise<void>;
  sendActivityEnd(): Promise<void>;
  sendToolResponse(responses: FunctionResponse[]): Promise<void>;
  
  on<E extends ProviderEvent>(event: E, handler: (data: ProviderEventData[E]) => void): void;
  off<E extends ProviderEvent>(event: E, handler: (data: ProviderEventData[E]) => void): void;
  
  dispose(): void;
}
```

#### `gemini/gemini-live.provider.ts`

Implementazione completa che:
1. Gestisce connessione WebSocket
2. Invia setup message alla connessione
3. Attende setupComplete prima di permettere operazioni
4. Converte audio PCM ↔ Base64
5. Parsa messaggi server e emette eventi appropriati
6. Gestisce interruzioni svuotando queue
7. Implementa cleanup corretto

### 3. Audio Managers (`lib/voice-chat/audio/`)

#### `audio-input.manager.ts`

Requisiti:
- Usa `navigator.mediaDevices.getUserMedia()` per accesso microfono
- Usa `AudioContext` + `AudioWorkletNode` per processing
- Converte Float32 → Int16 PCM
- Chunking a intervalli regolari (~100ms)
- Calcolo audio level per visualizzazione
- Cleanup completo stream e context

#### `audio-output.manager.ts`

Requisiti:
- Audio queue per buffering chunks
- `AudioContext` a 24kHz
- Decodifica Base64 → PCM → Float32
- Playback continuo senza gap
- Metodo `clear()` per interruzioni
- Gestione underrun (queue vuota)

#### `audio-utils.ts`
```typescript
export function pcmToBase64(pcm: ArrayBuffer): string;
export function base64ToPcm(base64: string): ArrayBuffer;
export function float32ToInt16(float32: Float32Array): Int16Array;
export function int16ToFloat32(int16: Int16Array): Float32Array;
export function calculateAudioLevel(samples: Float32Array): number;
```

### 4. Tools Registry (`lib/voice-chat/tools/`)

#### `tools-registry.ts`
```typescript
export class ToolsRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
  
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  getDeclarations(): Tool[] {
    // Converte in formato Gemini API
  }
  
  async execute(call: FunctionCall): Promise<FunctionResponse> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { id: call.id, name: call.name, response: { result: '', error: 'Tool not found' } };
    }
    try {
      const result = await tool.execute(call.args);
      return { id: call.id, name: call.name, response: { result: JSON.stringify(result) } };
    } catch (error) {
      return { id: call.id, name: call.name, response: { result: '', error: String(error) } };
    }
  }
  
  get isEmpty(): boolean {
    return this.tools.size === 0;
  }
}
```

### 5. Voice Chat Client (`lib/voice-chat/client/voice-chat.client.ts`)

```typescript
export class VoiceChatClient {
  private provider: VoiceChatProvider;
  private audioInput: AudioInputManager;
  private audioOutput: AudioOutputManager;
  private toolsRegistry: ToolsRegistry;
  private config: VoiceChatConfig;
  private state: ConnectionState = 'disconnected';
  
  constructor(options: VoiceChatClientOptions) {
    // Merge config con default
    // Setup provider event handlers
    // Setup tools registry
  }
  
  async connect(): Promise<void> {
    this.setState('connecting');
    await this.provider.connect(this.buildSessionConfig(), apiKey);
    this.setState('connected');
  }
  
  disconnect(): void {
    this.stopListening();
    this.provider.disconnect();
    this.setState('disconnected');
  }
  
  async startListening(): Promise<void> {
    await this.audioInput.start();
  }
  
  stopListening(): void {
    this.audioInput.stop();
  }
  
  async sendText(text: string): Promise<void> {
    await this.provider.sendText(text);
  }
  
  setMuted(muted: boolean): void {
    this.audioInput.setMuted(muted);
  }
  
  dispose(): void {
    this.disconnect();
    this.audioInput.dispose();
    this.audioOutput.dispose();
    this.provider.dispose();
  }
  
  private handleProviderAudio(data: ArrayBuffer): void {
    this.audioOutput.enqueue(data);
  }
  
  private handleProviderInterrupted(): void {
    this.audioOutput.clear();
  }
  
  private async handleToolCall(calls: FunctionCall[]): Promise<void> {
    const responses = await Promise.all(
      calls.map(call => this.toolsRegistry.execute(call))
    );
    await this.provider.sendToolResponse(responses);
  }
}
```

---

## Configurazione Default

```typescript
// lib/voice-chat/config/default.config.ts
export const defaultVoiceChatConfig: VoiceChatConfig = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  voice: 'Kore',
  language: 'it-IT',
  systemPrompt: 'Sei Jarvis, un assistente vocale italiano. Rispondi in modo conciso e naturale.',
  responseModalities: ['AUDIO'],
  audioInput: {
    sampleRate: 16000,
    channels: 1,
    bitDepth: 16,
  },
  audioOutput: {
    sampleRate: 24000,
    channels: 1,
    bitDepth: 16,
  },
  vad: {
    enabled: true,
    clientSide: false,
  },
  transcription: {
    input: true,
    output: true,
  },
};
```

```typescript
// lib/voice-chat/config/voices.config.ts
export const GEMINI_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Cacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
] as const;

export type GeminiVoice = typeof GEMINI_VOICES[number];
```

---

## Integrazione Hook React

L'hook `app/hooks/useVoiceChat.ts` utilizza:

- **VoiceChatClient** + **GeminiProvider**: connessione a Gemini Live, invio/ricezione audio e trascrizioni.
- **WakeWordManager**: ascolto locale fino al rilevamento della parola chiave (configurabile in `jarvis.config.ts`); poi connessione a Gemini e streaming bidirezionale.
- **ConversationStorage**: salvataggio turns in localStorage, soglia per riassunto, caricamento history al mount; `clearConversation` svuota storage e riconnette dopo clearChat tool.
- **Stati**: `connectionState`, `listeningMode` (idle | wake_word | connected), `messages`, `audioLevel`, `outputAudioLevel`, `error`.
- **Inactivity**: timeout di inattività (configurabile) per disconnettere e tornare in ascolto wake word.
- **API**: i tools chiamano le route `app/api/` (memory, calendar, tasks); l'auth Supabase viene usata lato server per le API protette.

---

## Dipendenze

Installate nel progetto:

- `@google/genai`: Gemini Live API (WebSocket) e embeddings (ricerca memorie).
- `@supabase/supabase-js`, `@supabase/ssr`: Auth e database (memorie episodiche/semantiche).
- `react-markdown`, `remark-gfm`: Rendering markdown nei messaggi.

Audio: Web Audio API e API native del browser (nessuna libreria audio aggiuntiva).

---

## Variabili Ambiente

File `.env.local` (o ambiente di deploy):

```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Per Google Calendar e Google Tasks sono necessari OAuth e variabili/secret lato server (vedi `app/lib/calendar/GOOGLE_CALENDAR_SETUP.md` e `app/lib/tasks/GOOGLE_TASKS_SETUP.md`).

**NOTA SICUREZZA**: Per produzione, considerare ephemeral tokens per l'API Gemini invece di esporre la key nel client.

---

## Checklist Implementazione

1. [x] Creare struttura directory `lib/voice-chat/`
2. [x] Implementare tutti i tipi in `types/`
3. [x] Creare configurazioni in `config/` + `jarvis.config.ts`
4. [x] Implementare `base.provider.ts` (interface)
5. [x] Implementare `gemini.provider.ts` (WebSocket + messaggi)
6. [x] Implementare `audio-input.manager.ts` (cattura microfono)
7. [x] Implementare `audio-output.manager.ts` (playback)
8. [x] Implementare `audio-utils.ts` (conversioni)
9. [x] Implementare tools (calendar, todos, timer, memorie episodiche/semantiche, clearChat, endConversation, disableAssistant)
10. [x] Implementare `voice-chat.client.ts` (orchestrazione)
11. [x] Wake word (`wake-word.manager.ts`), storage conversazione e riassunto
12. [x] Aggiornare `useVoiceChat.ts` hook (stati, storage, inactivity, clearChat)
13. [x] API routes: auth (Google), memory (episodic/semantic), calendar, tasks
14. [x] Variabili ambiente (Gemini API key, Supabase)

---

## Note per LLM Implementatore

1. **Ordine di implementazione**: Segui l'ordine della checklist - i tipi devono essere pronti prima delle implementazioni

2. **No `any`**: Tutti i tipi devono essere espliciti e strict

3. **Error handling**: Ogni modulo gestisce i propri errori e li propaga al layer superiore

4. **Cleanup**: Ogni classe con risorse implementa `dispose()` per rilascio

5. **Event-driven**: Usa pattern EventEmitter per comunicazione tra moduli

6. **Async/await**: Tutte le operazioni I/O sono async

7. **Browser-only**: Il codice audio gira solo nel browser, usa check `typeof window !== 'undefined'`

8. **Tools vuoti**: Il ToolsRegistry deve essere funzionante ma inizialmente vuoto

9. **Modularità**: Ogni file ha una singola responsabilità

10. **Naming**: 
    - File: `kebab-case.ts`
    - Classi: `PascalCase`
    - Funzioni/variabili: `camelCase`
    - Tipi/Interface: `PascalCase`
    - Costanti: `SCREAMING_SNAKE_CASE`

---

## Riferimenti

- [Gemini Live API Documentation](https://ai.google.dev/gemini-api/docs/live)
- [Live API WebSocket Reference](https://ai.google.dev/api/live)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaDevices.getUserMedia() MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
