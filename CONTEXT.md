## Domain Terms

### Reel Idea Generation

The automation flow that creates new reel records directly in status `idea`.
It generates and stores only the `idea` field for each new reel.

### Reel Scripting

The automation flow that processes existing reels already in status `idea`.
It generates the remaining reel content fields and, when complete, moves the reel to status `script`.

### Reel Published At

The timestamp that records when a reel most recently entered status `published`.
If a reel leaves `published`, this timestamp is cleared.
If it later re-enters `published`, this timestamp is set again.

### Reel Idea Generation Context

The user-provided guidance text used only by Reel Idea Generation.
It is separate from Reel Scripting guidance.

### Reel Scripting Context

The user-provided guidance text used only by Reel Scripting.
It is separate from Reel Idea Generation guidance.

### AI Idea Approval

The user action that promotes a reel from status `ai_idea` to status `idea`.
Any pending edits must be saved before the status transition is applied.

### AI Idea Backlog Limit

The maximum number of reels allowed to remain in status `ai_idea` for a user.
Reel Idea Generation must not create new `ai_idea` reels beyond this configured limit.

### AI Idea Ingress Rule

Only Reel Idea Generation may create or place a reel in status `ai_idea`.
Users may move reels out of `ai_idea`, but may never move any reel into `ai_idea` manually.

### Reel Automation Flow

The type of reel automation work, such as Reel Scripting or Reel Idea Generation.

### Reel Automation Run

One scheduled execution of a reel automation flow for a specific user and slot time.

### Reel Automation Job

The technical queued work unit used internally to execute reel automation behavior.

### Manual Reel Idea Generation Run

A user-triggered Reel Idea Generation run started from the AI Idea column header.
It executes the same generation behavior as the automated flow, but with a manual trigger.

### Single Flow Run Rule

For the same user, only one run of the same reel automation flow may execute at a time.

### Voice Chat Runtime

The module that owns the live assistant session lifecycle:
wake word activation, Gemini connection, transcript flow, conversation persistence,
chat switching, chat deletion, inactivity recovery, and UI-facing session commands.

It exposes a state snapshot subscription for UI adapters and a tool-executed event
subscription for domain-specific UI reactions. It owns disconnect-reset-reconnect
flows for chat switching, chat deletion, and new chat creation.
