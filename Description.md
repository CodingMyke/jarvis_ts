# Jarvis Voice Chat - Gemini Live API Implementation

## Overview per LLM

Questo documento descrive in dettaglio l'implementazione di un sistema di **voice chat real-time bidirezionale** utilizzando **Google Gemini Live API**. L'obiettivo è creare un'esperienza conversazionale naturale dove l'utente può parlare con l'AI e ricevere risposte vocali in tempo reale, con supporto per interruzioni (barge-in) e trascrizioni live.

---

## Contesto del Progetto

### Stack Tecnologico Esistente
- **Framework**: Next.js 16.0.5 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5
- **Styling**: Tailwind CSS 4
- **Lingua UI**: Italiano

### Struttura Attuale
```
jarvis_ts/
├── app/
│   ├── components/
│   │   ├── atoms/          # Button, TextInput, Icons
│   │   ├── molecules/      # ChatBubble, MicrophoneButton
│   │   └── organisms/      # ChatInput, MessageList, Header
│   ├── hooks/
│   │   └── useVoiceChat.ts # Hook attuale (da sostituire)
│   ├── lib/
│   │   └── speech/         # Logica speech attuale (Web Speech API)
│   └── types/
```

### Limitazione Attuale
Il progetto usa attualmente **Web Speech API** del browser che:
- Non supporta conversazioni naturali bidirezionali
- Ha latenza alta
- Non supporta interruzioni
- Separa STT e TTS in chiamate distinte

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

### Struttura Directory da Creare

```
lib/
└── voice-chat/
    ├── index.ts                    # Barrel exports pubblici
    │
    ├── types/
    │   ├── index.ts                # Re-export tutti i tipi
    │   ├── client.types.ts         # VoiceChatClientOptions, ConnectionState, VoiceChatError
    │   ├── messages.types.ts       # SetupMessage, RealtimeInputMessage, ServerMessage, etc.
    │   ├── audio.types.ts          # AudioConfig, AudioChunk, AudioFormat
    │   └── tools.types.ts          # ToolDefinition, FunctionCall, FunctionResponse
    │
    ├── config/
    │   ├── index.ts                # Re-export config
    │   ├── default.config.ts       # Configurazione default completa
    │   └── voices.config.ts        # Lista voci Gemini disponibili
    │
    ├── providers/
    │   ├── index.ts                # Export provider factory
    │   ├── base.provider.ts        # Interface VoiceChatProvider (astratta)
    │   └── gemini/
    │       ├── index.ts            # Export GeminiProvider
    │       ├── gemini-live.provider.ts   # Implementazione principale
    │       ├── gemini-connection.ts      # WebSocket management
    │       └── gemini-messages.ts        # Message builders/parsers
    │
    ├── audio/
    │   ├── index.ts                # Export managers
    │   ├── audio-input.manager.ts  # Cattura microfono con Web Audio API
    │   ├── audio-output.manager.ts # Riproduzione con AudioContext
    │   └── audio-utils.ts          # pcmToBase64, base64ToPcm, etc.
    │
    ├── tools/
    │   ├── index.ts                # Export registry
    │   ├── tools-registry.ts       # Registro tools (inizialmente vuoto)
    │   └── tool-executor.ts        # Esecuzione async dei tools
    │
    └── client/
        ├── index.ts                # Export client
        └── voice-chat.client.ts    # Client principale
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

Sostituire l'attuale `app/hooks/useVoiceChat.ts` con:

```typescript
import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  VoiceChatClient, 
  createGeminiProvider,
  ConnectionState,
  VoiceChatError 
} from '@/lib/voice-chat';
import type { Message } from '@/lib/speech/types';

interface UseVoiceChatReturn {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  messages: Message[];
  audioLevel: number;
  error: VoiceChatError | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

export function useVoiceChat(): UseVoiceChatReturn {
  const clientRef = useRef<VoiceChatClient | null>(null);
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<VoiceChatError | null>(null);
  
  const connect = useCallback(async () => {
    const provider = createGeminiProvider();
    
    const client = new VoiceChatClient({
      provider,
      config: {
        voice: 'Kore',
        language: 'it-IT',
      },
      tools: [], // Lista vuota, pronta per futuro
      onTranscript: (text, type) => {
        setMessages(prev => [...prev, {
          role: type === 'input' ? 'user' : 'assistant',
          content: text,
          timestamp: Date.now(),
        }]);
      },
      onStateChange: setState,
      onError: setError,
      onAudioLevel: setAudioLevel,
    });
    
    clientRef.current = client;
    await client.connect();
    await client.startListening();
    setIsListening(true);
  }, []);
  
  const disconnect = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current = null;
    setIsListening(false);
    setState('disconnected');
  }, []);
  
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    clientRef.current?.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);
  
  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
    };
  }, []);
  
  return {
    isConnected: state === 'connected',
    isListening,
    isMuted,
    messages,
    audioLevel,
    error,
    connect,
    disconnect,
    toggleMute,
  };
}
```

---

## Dipendenze da Installare

```bash
npm install @google/genai
```

Nessun'altra dipendenza richiesta - tutto usa API native del browser.

---

## Variabili Ambiente

Creare/aggiornare `.env.local`:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

**NOTA SICUREZZA**: Per produzione, usare ephemeral tokens invece di esporre l'API key nel client.

---

## Checklist Implementazione

1. [ ] Creare struttura directory `lib/voice-chat/`
2. [ ] Implementare tutti i tipi in `types/`
3. [ ] Creare configurazioni in `config/`
4. [ ] Implementare `base.provider.ts` (interface)
5. [ ] Implementare `gemini-live.provider.ts` (WebSocket + messaggi)
6. [ ] Implementare `audio-input.manager.ts` (cattura microfono)
7. [ ] Implementare `audio-output.manager.ts` (playback)
8. [ ] Implementare `audio-utils.ts` (conversioni)
9. [ ] Implementare `tools-registry.ts` (vuoto ma funzionante)
10. [ ] Implementare `voice-chat.client.ts` (orchestrazione)
11. [ ] Creare tutti i barrel `index.ts`
12. [ ] Aggiornare `useVoiceChat.ts` hook
13. [ ] Configurare variabili ambiente
14. [ ] Testare flusso completo

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
