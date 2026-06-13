## Domain Terms

### Voice Chat Runtime

The module that owns the live assistant session lifecycle:
wake word activation, Gemini connection, transcript flow, conversation persistence,
chat switching, chat deletion, inactivity recovery, and UI-facing session commands.

It exposes a state snapshot subscription for UI adapters and a tool-executed event
subscription for domain-specific UI reactions. It owns disconnect-reset-reconnect
flows for chat switching, chat deletion, and new chat creation.
