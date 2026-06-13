# User Settings Timezone Design

## Goal

Move the user timezone out of `progression_profiles` and make it a global user preference
stored in `public.user_settings`, so every feature can read the same source of truth.

The timezone must:

- be initialized automatically from the browser on the first authenticated app entry;
- remain stable until the user changes it manually in `/settings`;
- be readable by any feature that needs user-local time behavior;
- no longer belong to the progression domain.

## Product Decision

The timezone is a per-user preference, not a progression-specific field.

`public.user_settings` will store one row per user. The initial version contains:

- `user_id`
- `timezone`
- timestamps

The authenticated app shell will ensure the row exists. On first initialization only,
the app will persist the browser timezone. Later browser changes must not overwrite the
stored value automatically.

The `/settings` page becomes the official place where the user can view and update the
timezone.

## Architecture

Introduce a new feature boundary for user settings:

- `app/_features/user-settings`

This boundary owns:

- settings data contracts and Zod validation;
- server-side read/ensure/update operations;
- route handlers for user settings APIs;
- client helpers used by `/settings` and app-shell initialization.

This boundary is feature-agnostic. It exists so progression, academy automation, and
future features can depend on the same user preference source without coupling
themselves to each other.

`progression_profiles` remains progression-owned and keeps only progression state such
as XP, level, and timestamps.

## Data Model

Create `public.user_settings`:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `timezone text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- `timezone` must be trimmed and have a bounded length similar to current progression
  validation;
- the value is expected to be an IANA timezone string from the browser or settings UI.

Security:

- enable RLS;
- allow each authenticated user to read and update only their own row;
- no cross-user access.

## Runtime Behavior

### First-time initialization

On authenticated app-shell entry:

1. Read `Intl.DateTimeFormat().resolvedOptions().timeZone` in the browser.
2. Call `ensureUserSettings(timezone)`.
3. The backend inserts a row only if none exists yet.
4. If a row already exists, keep the stored timezone unchanged.

This gives automatic setup without making browser location changes silently rewrite a
user preference.

### Settings editing

The `/settings` page will:

- load the current `user_settings` row;
- display the current timezone;
- let the user change it manually;
- persist changes through a dedicated update endpoint.

The saved timezone applies only to future calculations. Historical records that already
store a timezone snapshot keep their original values.

## Progression Impact

Progression must stop owning the timezone.

Required changes:

- remove `timezone` from `progression_profiles`;
- remove progression APIs that exist only to ensure or update progression timezone;
- update progression services to read the user timezone from `user_settings`;
- keep check-in rows storing their own `timezone` field for historical consistency;
- keep local-date calculations based on the persisted user timezone.

This preserves the existing progression behavior while moving ownership of the
preference to the correct module.

## Other Feature Impact

Any feature that needs user-local scheduling or "today" semantics must read from
`user_settings`.

This includes:

- progression day-boundary logic;
- reel automation scheduling and due-slot calculation;
- future user-local reminders, scheduling, or calendar-adjacent behaviors.

Features may still store their own timezone snapshots in historical records when the
snapshot is part of the event history. They must not own the current preference.

## API Design

Add a user settings API boundary, for example:

- `GET /api/user/settings`
- `PATCH /api/user/settings`
- internal ensure operation used by authenticated app-shell startup

Behavior:

- `GET` returns the current settings row, creating or normalizing nothing by itself;
- `PATCH` updates only allowed settings fields;
- `ensureUserSettings(timezone)` is used by app initialization and inserts only when
  the row does not exist yet.

Validation:

- request bodies validated with Zod;
- timezone strings trimmed and bounded;
- clear error responses through existing HTTP helpers and feature error conventions.

## Settings UI

Extend the existing `/settings` page with a user timezone section.

The section should:

- show the persisted timezone;
- allow manual editing;
- save with explicit user action;
- show loading and save feedback consistent with existing settings UI patterns.

This timezone section lives alongside current settings areas such as integrations and
reel automation settings.

## Database Migration Strategy

The user requested a single rollout, not a staged multi-release migration.

The migration and code rollout should therefore happen together in one implementation
pass:

1. Create `public.user_settings` with RLS and timestamps.
2. Backfill `user_settings.timezone` from existing `progression_profiles.timezone`.
3. Update application code to read timezone from `user_settings`.
4. Remove `timezone` from `progression_profiles`.
5. Regenerate Supabase types.
6. Update docs that still describe progression as the timezone owner.

This is still one coherent rollout, but the implementation order inside the PR should
protect correctness. The backfill must happen before the column is removed.

## Risk Notes

The highest risk is breaking progression or scheduler behavior during the ownership
move.

To reduce that risk inside the one-pass rollout:

- backfill before dropping the old column;
- switch all readers to `user_settings` before relying on the dropped field;
- verify progression "today" calculations after migration;
- verify automation scheduling reads persisted user settings rather than browser
  timezone or progression data.

## Testing

Required verification:

- unit tests for `user-settings` schemas and services;
- route tests for `GET/PATCH /api/user/settings`;
- settings UI tests for loading and updating timezone;
- progression service tests updated to use `user_settings`;
- reel scheduling tests updated to use `user_settings` where applicable;
- migration verification that existing progression users keep their timezone;
- `npm run lint`;
- `npm run typecheck`;
- targeted `npm run test` for touched areas;
- browser verification of timezone update in `/settings`.

## Documentation Updates

Update:

- `README.md` if settings architecture or setup expectations need mention;
- `docs/progression-system-spec.md` so progression no longer claims timezone ownership.

`Description.md` does not need changes unless chat-memory behavior is affected, which it
is not.

## Implementation Summary

The final design is:

- add `public.user_settings` as the user-owned settings table;
- make `timezone` a global user preference stored there;
- seed it automatically from the browser only on first authenticated entry;
- let the user change it from `/settings`;
- make progression and any other feature read timezone from `user_settings`;
- remove `timezone` from `progression_profiles`;
- keep timezone snapshots only in historical records that need them.
