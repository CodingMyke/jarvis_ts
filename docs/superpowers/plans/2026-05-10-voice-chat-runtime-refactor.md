# Voice Chat Runtime Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are explicitly requested by the user) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a single shared `Voice Chat Runtime` that owns the live assistant session lifecycle, while reducing `useVoiceChat` to a thin UI adapter.

**Architecture:** Move wake word, Gemini transport, transcript assembly, conversation persistence, chat switching, chat deletion, inactivity recovery, and reconnect flows behind one deep module named `Voice Chat Runtime`. Expose a state-snapshot subscription plus a `tool executed` event subscription through a provider mounted at the app root, and keep calendar/task refresh reactions in UI adapters outside the runtime seam.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Vitest, Testing Library, Supabase-backed chat APIs, Gemini Live transport.

---

## Scope Check

This plan covers one subsystem only: the assistant live session runtime.

In scope:

- extract `Voice Chat Runtime` as the single owner of live assistant session state
- add provider + subscription-based access
- move transcript/message projection into the runtime
- move chat persistence and chat-switch/delete/new-chat orchestration into runtime-owned modules
- keep `disconnect -> reset -> reconnect` for switch/delete/new-chat flows
- move hook-heavy tests to runtime-focused tests

Out of scope:

- tool definition changes
- calendar/task feature logic
- visual redesign
- Supabase schema changes
- changes to chat retention behavior

## File Structure Map

**Create**
- `app/_features/assistant/runtime/voice-chat-runtime.ts`
- `app/_features/assistant/runtime/voice-chat-runtime.types.ts`
- `app/_features/assistant/runtime/voice-chat-runtime.store.ts`
- `app/_features/assistant/runtime/voice-chat-session-controller.ts`
- `app/_features/assistant/runtime/voice-chat-chat-manager.ts`
- `app/_features/assistant/runtime/voice-chat-tool-events.ts`
- `app/_features/assistant/runtime/adapters/chat-persistence.adapter.ts`
- `app/_features/assistant/runtime/adapters/gemini-transport.adapter.ts`
- `app/_features/assistant/runtime/adapters/wake-word.adapter.ts`
- `app/_features/assistant/runtime/VoiceChatRuntimeProvider.tsx`
- `app/_features/assistant/runtime/useVoiceChatRuntime.ts`
- `app/_features/assistant/runtime/voice-chat-runtime.test.ts`
- `app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx`

**Modify**
- `app/_features/assistant/hooks/useVoiceChat.ts`
- `app/_features/assistant/hooks/useVoiceChat.test.tsx`
- `app/_features/assistant/lib/conversation-persistence.ts`
- `app/_features/assistant/lib/conversation-persistence.test.ts`
- `app/_features/assistant/lib/index.ts`
- `app/_features/assistant/types/client.types.ts`
- `app/design/templates/app-shell/AppShellAssistantProvider.tsx`
- `app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`
- `app/design/templates/assistant/useAssistantWorkspace.ts`
- `app/design/templates/assistant/useAssistantWorkspace.test.tsx`
- `app/layout.tsx`
- `README.md`

**Reference**
- `CONTEXT.md`
- `README.md`
- `Description.md`
- `app/_features/assistant/lib/transport/gemini-live-client.ts`
- `app/_features/assistant/lib/session-machine.ts`
- `app/_features/assistant/lib/wake-word-lifecycle.ts`

---

### Task 1: Define the Voice Chat Runtime Contracts

**Files:**
- Create: `app/_features/assistant/runtime/voice-chat-runtime.types.ts`
- Create: `app/_features/assistant/runtime/voice-chat-tool-events.ts`
- Modify: `app/_features/assistant/lib/index.ts`
- Modify: `app/_features/assistant/types/client.types.ts`
- Test: `app/_features/assistant/runtime/voice-chat-runtime.test.ts`

- [x] **Step 1: Write the failing runtime contract test**

Add a new test file that locks in the public runtime shape:

```ts
it("exposes a snapshot subscription and a tool-executed event subscription", () => {
  const runtime = createVoiceChatRuntime(buildRuntimeDeps());

  expect(runtime.getSnapshot()).toMatchObject({
    connectionState: "disconnected",
    listeningMode: "idle",
    isMuted: false,
    messages: [],
    audioLevel: 0,
    outputAudioLevel: 0,
    error: null,
    chatId: null,
    chatTitle: null,
  });

  expect(typeof runtime.subscribe).toBe("function");
  expect(typeof runtime.subscribeToolExecuted).toBe("function");
});
```

- [x] **Step 2: Run the contract test to verify it fails**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts
```

Expected: FAIL because the runtime files and exports do not exist yet.

- [x] **Step 3: Add the runtime type contracts**

Create the exact public contracts:

- `VoiceChatRuntimeSnapshot`
- `VoiceChatRuntimeToolExecutedEvent`
- `VoiceChatRuntime`
- `VoiceChatRuntimeDependencies`

Include:

- `getSnapshot(): VoiceChatRuntimeSnapshot`
- `subscribe(listener): unsubscribe`
- `subscribeToolExecuted(listener): unsubscribe`
- `startListening()`
- `stopListening()`
- `toggleMute()`
- `deleteCurrentChat(): Promise<void>`
- `dispose()`

Keep calendar/task concerns out of these contracts.

- [x] **Step 4: Export the new contracts without wiring implementation yet**

Update assistant exports so the runtime contracts can be imported from one stable assistant seam. Keep existing hook exports intact for now.

- [x] **Step 5: Run the contract test again**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts
```

Expected: PASS for type/shape-level contract assertions.

- [x] **Step 6: Commit the runtime contracts**

Run:

```bash
git add app/_features/assistant/runtime/voice-chat-runtime.types.ts app/_features/assistant/runtime/voice-chat-tool-events.ts app/_features/assistant/lib/index.ts app/_features/assistant/types/client.types.ts app/_features/assistant/runtime/voice-chat-runtime.test.ts
git commit -m "feat: define voice chat runtime contracts"
```

---

### Task 2: Extract Runtime-Owned Chat Persistence and Chat State Modules

**Files:**
- Create: `app/_features/assistant/runtime/adapters/chat-persistence.adapter.ts`
- Create: `app/_features/assistant/runtime/voice-chat-chat-manager.ts`
- Create: `app/_features/assistant/runtime/voice-chat-runtime.store.ts`
- Modify: `app/_features/assistant/lib/conversation-persistence.ts`
- Modify: `app/_features/assistant/lib/conversation-persistence.test.ts`
- Test: `app/_features/assistant/runtime/voice-chat-runtime.test.ts`

- [x] **Step 1: Write the failing chat-manager tests**

Add tests for runtime-owned chat state rules:

```ts
it("loads full_history for UI and assistant_history for the model", async () => {
  const runtime = createVoiceChatRuntime(buildRuntimeDeps({
    fetchChatById: vi.fn().mockResolvedValue({
      success: true,
      chat: {
        title: "Storica",
        full_history: [{ role: "user", parts: [{ text: "Ciao" }] }],
        assistant_history: [{ role: "model", parts: [{ text: "Riassunto" }] }],
      },
    }),
  }));

  await runtime.startListening();
  await deps.wakeWord.emitWakeWord("Jarvis");

  expect(runtime.getSnapshot().messages[0]).toMatchObject({ text: "Ciao", isUser: true });
  expect(deps.transport.sendHistory).toHaveBeenCalledWith(
    [{ role: "model", parts: [{ text: "Riassunto" }] }],
    false,
  );
});
```

Also add tests for:

- delta persistence uses `lastSavedTurnCount`
- deleting current chat clears UI state before reconnect
- switching chat resets current messages and metadata
- creating a new chat does not keep the command turn in saved history

- [x] **Step 2: Run the runtime tests to verify they fail**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts app/_features/assistant/lib/conversation-persistence.test.ts
```

Expected: FAIL because the chat manager/store do not exist and persistence helpers still expose the old shape only.

- [x] **Step 3: Extract the chat persistence adapter**

Move raw `fetch` request details behind `chat-persistence.adapter.ts`.

The adapter should expose small assistant-specific operations:

- `createChat(turns)`
- `appendChatTurns(id, turns)`
- `fetchChatById(id)`
- `deleteChatById(id)`

Keep request URLs and `fetch` details here only.

- [x] **Step 4: Build the runtime store**

Create a focused store that owns:

- current snapshot values
- message projection state
- current message ids for transcript merging
- chat metadata
- `lastSavedTurnCount`
- error updates

Make the store expose deterministic mutation methods instead of direct object mutation.

- [x] **Step 5: Build the chat manager**

Move these responsibilities out of `useVoiceChat`:

- load current chat by id
- project `full_history` into UI `Message[]`
- return `assistant_history` for model seeding
- save deltas only
- delete current or arbitrary chat
- prepare switch/new-chat transitions

The chat manager must not touch React state directly.

- [x] **Step 6: Run the runtime and persistence tests again**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts app/_features/assistant/lib/conversation-persistence.test.ts
```

Expected: PASS for chat-loading, delta-saving, and chat-reset invariants.

- [x] **Step 7: Commit the runtime chat modules**

Run:

```bash
git add app/_features/assistant/runtime/adapters/chat-persistence.adapter.ts app/_features/assistant/runtime/voice-chat-chat-manager.ts app/_features/assistant/runtime/voice-chat-runtime.store.ts app/_features/assistant/lib/conversation-persistence.ts app/_features/assistant/lib/conversation-persistence.test.ts app/_features/assistant/runtime/voice-chat-runtime.test.ts
git commit -m "feat: extract voice chat runtime chat modules"
```

---

### Task 3: Build the Session Controller and Runtime Orchestrator

**Files:**
- Create: `app/_features/assistant/runtime/adapters/gemini-transport.adapter.ts`
- Create: `app/_features/assistant/runtime/adapters/wake-word.adapter.ts`
- Create: `app/_features/assistant/runtime/voice-chat-session-controller.ts`
- Create: `app/_features/assistant/runtime/voice-chat-runtime.ts`
- Modify: `app/_features/assistant/lib/index.ts`
- Test: `app/_features/assistant/runtime/voice-chat-runtime.test.ts`

- [x] **Step 1: Write the failing session-flow tests**

Add runtime orchestration tests for:

- wake word -> connect -> first user message -> create chat
- inactivity timeout -> disconnect -> wake word resume
- unexpected disconnect -> delta save -> wake word resume
- stop listening -> save + dispose + idle
- `disconnect -> reset -> reconnect` on switch/delete/new chat

Example:

```ts
it("returns to wake_word after inactivity timeout", async () => {
  const runtime = createVoiceChatRuntime(buildRuntimeDeps());

  runtime.startListening();
  await deps.wakeWord.emitWakeWord("Jarvis");
  deps.transport.emitTurnComplete();
  await vi.advanceTimersByTimeAsync(20_000);

  expect(runtime.getSnapshot().listeningMode).toBe("wake_word");
  expect(deps.transport.dispose).toHaveBeenCalled();
  expect(deps.wakeWord.resume).toHaveBeenCalled();
});
```

- [x] **Step 2: Run the session-flow tests to verify they fail**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts
```

Expected: FAIL because the runtime orchestrator and adapters do not exist yet.

- [x] **Step 3: Wrap the existing Gemini client behind a transport adapter**

Create `gemini-transport.adapter.ts` that normalizes:

- `connect`
- `startListening`
- `sendText`
- `sendHistory`
- `setMuted`
- `dispose`
- event listeners for transcript, audio/output level, disconnected, error, turn complete, tool call

Do not let the runtime depend directly on the concrete Gemini client class.

- [x] **Step 4: Wrap wake-word lifecycle behind an adapter**

Create `wake-word.adapter.ts` that normalizes:

- `start`
- `resume`
- `dispose`
- wake-word event emission
- wake-word error emission

- [x] **Step 5: Implement the session controller**

Move lifecycle orchestration out of the hook:

- `startListening`
- connect on wake word
- seed model with `assistant_history`
- merge live transcripts into runtime-owned messages
- schedule and clear inactivity timeout
- recover from disconnects
- dispatch runtime tool events after tool execution

Keep `disconnect -> reset -> reconnect` explicit and centralized for:

- switch chat
- delete current chat
- create new chat

- [x] **Step 6: Implement the runtime orchestrator**

Create `voice-chat-runtime.ts` as the deep module that composes:

- runtime store
- session controller
- chat manager
- tool event emitter

The runtime should be the only thing the provider and hook know about.

- [x] **Step 7: Run the runtime tests again**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts
```

Expected: PASS for lifecycle, transcript, persistence, and reconnect behavior.

- [x] **Step 8: Commit the runtime orchestrator**

Run:

```bash
git add app/_features/assistant/runtime/adapters/gemini-transport.adapter.ts app/_features/assistant/runtime/adapters/wake-word.adapter.ts app/_features/assistant/runtime/voice-chat-session-controller.ts app/_features/assistant/runtime/voice-chat-runtime.ts app/_features/assistant/lib/index.ts app/_features/assistant/runtime/voice-chat-runtime.test.ts
git commit -m "feat: build voice chat runtime orchestrator"
```

---

### Task 4: Mount the Shared Runtime Provider and Thin the Hook

**Files:**
- Create: `app/_features/assistant/runtime/VoiceChatRuntimeProvider.tsx`
- Create: `app/_features/assistant/runtime/useVoiceChatRuntime.ts`
- Modify: `app/_features/assistant/hooks/useVoiceChat.ts`
- Modify: `app/_features/assistant/hooks/useVoiceChat.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/_features/assistant/lib/index.ts`
- Test: `app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx`
- Test: `app/_features/assistant/hooks/useVoiceChat.test.tsx`

- [x] **Step 1: Write the failing provider and hook-adapter tests**

Add tests that prove:

- the provider creates one runtime instance and disposes it on unmount
- `useVoiceChat` reads from provider snapshot state
- `useVoiceChat` forwards commands instead of owning implementation
- rendering two consumers under one provider shares the same session state

Example:

```ts
it("shares one runtime across multiple consumers", () => {
  render(
    <VoiceChatRuntimeProvider>
      <FirstConsumer />
      <SecondConsumer />
    </VoiceChatRuntimeProvider>,
  );

  expect(screen.getAllByText("idle")).toHaveLength(2);
});
```

- [x] **Step 2: Run the provider and hook tests to verify they fail**

Run:

```bash
npm run test -- app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx app/_features/assistant/hooks/useVoiceChat.test.tsx
```

Expected: FAIL because the provider and thin-hook behavior do not exist yet.

- [x] **Step 3: Implement the runtime provider**

Mount one runtime instance high in the app tree and expose it through context. Use `app/layout.tsx` so the session survives navigation between app-shell routes and `/assistant`.

- [x] **Step 4: Implement `useVoiceChatRuntime`**

Create a tiny helper hook that throws clearly if used outside the provider and returns the runtime instance.

- [x] **Step 5: Reduce `useVoiceChat` to a thin adapter**

Rewrite `useVoiceChat` so it:

- subscribes to runtime snapshot changes
- returns snapshot values
- forwards `startListening`, `stopListening`, `toggleMute`, and `deleteCurrentChat`

Remove runtime ownership from the hook entirely.

- [x] **Step 6: Run the provider and hook tests again**

Run:

```bash
npm run test -- app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx app/_features/assistant/hooks/useVoiceChat.test.tsx
```

Expected: PASS with small hook tests and provider-backed shared runtime behavior.

- [x] **Step 7: Commit the provider and thin hook**

Run:

```bash
git add app/_features/assistant/runtime/VoiceChatRuntimeProvider.tsx app/_features/assistant/runtime/useVoiceChatRuntime.ts app/_features/assistant/hooks/useVoiceChat.ts app/_features/assistant/hooks/useVoiceChat.test.tsx app/layout.tsx app/_features/assistant/lib/index.ts app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx
git commit -m "feat: mount shared voice chat runtime provider"
```

---

### Task 5: Rewire UI Adapters to Runtime Snapshot and Tool Events

**Files:**
- Modify: `app/design/templates/app-shell/AppShellAssistantProvider.tsx`
- Modify: `app/design/templates/app-shell/AppShellAssistantProvider.test.tsx`
- Modify: `app/design/templates/assistant/useAssistantWorkspace.ts`
- Modify: `app/design/templates/assistant/useAssistantWorkspace.test.tsx`
- Test: `app/design/app-shell-ui.test.tsx`
- Test: `app/design/assistant-ui.test.tsx`

- [ ] **Step 1: Write the failing UI adapter tests**

Add tests that prove:

- app-shell assistant controls still react to `listeningMode`
- assistant workspace still reads `messages`, `chatTitle`, `outputAudioLevel`, and `deleteChat`
- calendar/task refreshes are driven by `tool executed` subscriptions outside the runtime

- [ ] **Step 2: Run the UI adapter tests to verify they fail**

Run:

```bash
npm run test -- app/design/templates/app-shell/AppShellAssistantProvider.test.tsx app/design/templates/assistant/useAssistantWorkspace.test.tsx app/design/app-shell-ui.test.tsx app/design/assistant-ui.test.tsx
```

Expected: FAIL because UI adapters still assume the old hook-owned runtime behavior.

- [ ] **Step 3: Rewire the app-shell assistant adapter**

Update `AppShellAssistantProvider` to:

- consume `useVoiceChat`
- subscribe to runtime `tool executed` events via the provider/runtime hook
- keep calendar/task refresh timing in this UI adapter only

- [ ] **Step 4: Rewire the assistant workspace adapter**

Update `useAssistantWorkspace` to:

- consume `useVoiceChat`
- read runtime-owned `messages`, `chatTitle`, `outputAudioLevel`
- subscribe to runtime `tool executed` events for calendar/task refreshes
- keep `orbState` and button behavior outside the runtime

- [ ] **Step 5: Run the UI adapter tests again**

Run:

```bash
npm run test -- app/design/templates/app-shell/AppShellAssistantProvider.test.tsx app/design/templates/assistant/useAssistantWorkspace.test.tsx app/design/app-shell-ui.test.tsx app/design/assistant-ui.test.tsx
```

Expected: PASS with unchanged visible behavior.

- [ ] **Step 6: Commit the UI adapter rewiring**

Run:

```bash
git add app/design/templates/app-shell/AppShellAssistantProvider.tsx app/design/templates/app-shell/AppShellAssistantProvider.test.tsx app/design/templates/assistant/useAssistantWorkspace.ts app/design/templates/assistant/useAssistantWorkspace.test.tsx app/design/app-shell-ui.test.tsx app/design/assistant-ui.test.tsx
git commit -m "refactor: rewire assistant ui adapters to voice chat runtime"
```

---

### Task 6: Verify the Runtime Refactor End-to-End and Update Docs

**Files:**
- Modify: `README.md`
- Modify: `CONTEXT.md` (only if the implementation sharpens the runtime term further)

- [ ] **Step 1: Update the assistant architecture notes in README**

Document:

- `Voice Chat Runtime` as the owner of the live assistant session
- root-mounted runtime provider
- `useVoiceChat` as a thin adapter
- UI adapters reacting to `tool executed` subscriptions

- [ ] **Step 2: Run the assistant-focused test suite**

Run:

```bash
npm run test -- app/_features/assistant/runtime/voice-chat-runtime.test.ts app/_features/assistant/runtime/VoiceChatRuntimeProvider.test.tsx app/_features/assistant/hooks/useVoiceChat.test.tsx app/design/templates/app-shell/AppShellAssistantProvider.test.tsx app/design/templates/assistant/useAssistantWorkspace.test.tsx app/design/app-shell-ui.test.tsx app/design/assistant-ui.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Smoke-test the shared runtime behavior manually**

Run:

```bash
npm run dev
```

Then verify manually:

- start assistant from the app-shell sidebar logo
- navigate between `/dashboard` and `/assistant`
- confirm one live session persists
- confirm delete/new/switch chat still use reconnect behavior
- confirm calendar/task tool side effects still refresh UI

- [ ] **Step 6: Commit docs and final verification changes**

Run:

```bash
git add README.md CONTEXT.md
git commit -m "docs: document voice chat runtime architecture"
```

---

## Notes for Execution

- Keep the runtime seam strict: no calendar store, no task store, no CSS/UI semantics inside the runtime.
- Prefer adapting the existing Gemini client and wake-word lifecycle before rewriting behavior.
- Keep `disconnect -> reset -> reconnect` explicit; do not introduce in-place transport switching in this refactor.
- Preserve chat persistence invariants from `Description.md` exactly as they are today.
- Preserve current tool behavior and only move orchestration ownership.

## Suggested Commit Sequence

1. `feat: define voice chat runtime contracts`
2. `feat: extract voice chat runtime chat modules`
3. `feat: build voice chat runtime orchestrator`
4. `feat: mount shared voice chat runtime provider`
5. `refactor: rewire assistant ui adapters to voice chat runtime`
6. `docs: document voice chat runtime architecture`
