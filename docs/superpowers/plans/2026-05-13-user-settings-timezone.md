# User Settings Timezone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status note (2026-05-15):** Implementation and automated verification are complete on this branch. Commit-slice steps remain unchecked where the work was committed in a different shape than this plan suggested. Manual browser verification remains unchecked because it is not documented as completed.

**Goal:** Move timezone ownership from `progression_profiles` to a new per-user `user_settings` table, auto-seed it once from the browser, expose it in `/settings`, and make progression plus reel scheduling read from the new source of truth.

**Architecture:** Add a new `app/_features/user-settings` boundary with schemas, service, route handlers, and client helpers. Roll out the DB migration, generated Supabase types, settings UI, progression refactor, and reel scheduler refactor in one implementation pass while preserving historical timezone snapshots on check-ins.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5, Zod, Vitest, Supabase migrations/RLS/RPCs.

---

## File Map

### New files

- `supabase/migrations/20260513010000_move_timezone_to_user_settings.sql`
- `app/_features/user-settings/index.ts`
- `app/_features/user-settings/lib/user-settings.schemas.ts`
- `app/_features/user-settings/lib/user-settings-client.ts`
- `app/_features/user-settings/lib/user-settings-client.test.ts`
- `app/_features/user-settings/server/user-settings.service.ts`
- `app/_features/user-settings/server/user-settings.service.test.ts`
- `app/_features/user-settings/server/user-settings-route.schemas.ts`
- `app/_features/user-settings/server/user-settings-route.handlers.ts`
- `app/_features/user-settings/server/user-settings-route.handlers.test.ts`
- `app/api/user/settings/route.ts`

### Modified files

- `app/_server/supabase/database.types.ts`
- `app/design/organisms/auth/SettingsPanel.tsx`
- `app/design/auth-ui.test.tsx`
- `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`
- `app/_features/progression/index.ts`
- `app/_features/progression/lib/progression-client.ts`
- `app/_features/progression/lib/progression-client.test.ts`
- `app/_features/progression/server/progression-route.schemas.ts`
- `app/_features/progression/server/progression-route.handlers.ts`
- `app/_features/progression/server/progression-route.handlers.test.ts`
- `app/_features/progression/server/progression.service.ts`
- `app/_features/progression/server/progression.service.test.ts`
- `app/api/progression/profile/route.ts`
- `app/api/progression/status/route.ts`
- `app/_features/academy/reels/server/reel-worker.service.ts`
- `app/_features/academy/reels/server/reel-worker.service.test.ts`
- `README.md`
- `docs/progression-system-spec.md`

### Responsibility notes

- `user-settings` owns the current timezone preference.
- `progression` owns XP/level/goals/check-ins only.
- `SettingsPanel` becomes the manual edit surface for timezone.
- `AppShellProgressionProvider` becomes the first-entry bootstrapper for timezone seeding.
- `reel-worker.service.ts` must evaluate due run slots in the persisted user timezone, not UTC.

---

### Task 1: Add the database migration and regenerate Supabase types

**Files:**
- Create: `supabase/migrations/20260513010000_move_timezone_to_user_settings.sql`
- Modify: `app/_server/supabase/database.types.ts`
- Test/Verify: generated type output and migration SQL review

- [x] **Step 1: Create the migration file**

Run:

```bash
supabase migration new move_timezone_to_user_settings
```

Expected: a new file appears under `supabase/migrations/` and is renamed or edited to:

```text
supabase/migrations/20260513010000_move_timezone_to_user_settings.sql
```

- [x] **Step 2: Write the migration SQL**

Put this structure into `supabase/migrations/20260513010000_move_timezone_to_user_settings.sql`:

```sql
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null check (char_length(trim(timezone)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_current_timestamp_updated_at();

alter table public.user_settings enable row level security;

create policy user_settings_own_rows
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.user_settings (user_id, timezone)
select user_id, timezone
from public.progression_profiles
on conflict (user_id) do nothing;

create or replace function public.progression_ensure_profile()
returns public.progression_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.progression_profiles;
begin
  if v_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  insert into public.progression_profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_profile
  from public.progression_profiles
  where user_id = v_user_id;

  return v_profile;
end;
$$;

alter table public.progression_profiles
  drop column timezone;
```

Also update every SQL function inside the same migration file chain that still calls `public.progression_ensure_profile('UTC')` or expects a `p_timezone` profile seed so they now call `public.progression_ensure_profile()` with no argument.

- [x] **Step 3: Update the progression RPC signatures inside the generated types**

After applying the migration locally or against the linked project, regenerate types:

```bash
npm run gen-supabase-types
```

Expected generated changes inside `app/_server/supabase/database.types.ts`:

```ts
user_settings: {
  Row: {
    user_id: string
    timezone: string
    created_at: string
    updated_at: string
  }
  Insert: {
    user_id: string
    timezone: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    user_id?: string
    timezone?: string
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}
```

And the RPC args should change from:

```ts
progression_ensure_profile: {
  Args: { p_timezone: string }
```

to:

```ts
progression_ensure_profile: {
  Args: Record<PropertyKey, never>
```

- [x] **Step 4: Verify the generated type diff**

Run:

```bash
rg -n "user_settings|progression_ensure_profile|timezone:" app/_server/supabase/database.types.ts
```

Expected:
- `user_settings` table exists
- `progression_profiles.Row` no longer has `timezone`
- `progression_ensure_profile` no longer takes `p_timezone`

- [ ] **Step 5: Commit the DB/type foundation**

```bash
git add supabase/migrations/20260513010000_move_timezone_to_user_settings.sql app/_server/supabase/database.types.ts
git commit -m "feat: move timezone ownership to user settings"
```

---

### Task 2: Add the new `user-settings` feature boundary

**Files:**
- Create: `app/_features/user-settings/index.ts`
- Create: `app/_features/user-settings/lib/user-settings.schemas.ts`
- Create: `app/_features/user-settings/lib/user-settings-client.ts`
- Create: `app/_features/user-settings/lib/user-settings-client.test.ts`
- Create: `app/_features/user-settings/server/user-settings.service.ts`
- Create: `app/_features/user-settings/server/user-settings.service.test.ts`
- Create: `app/_features/user-settings/server/user-settings-route.schemas.ts`
- Create: `app/_features/user-settings/server/user-settings-route.handlers.ts`
- Create: `app/_features/user-settings/server/user-settings-route.handlers.test.ts`

- [x] **Step 1: Write the failing service and client tests**

Create `app/_features/user-settings/server/user-settings.service.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  ensureUserSettings,
  getUserSettings,
  updateUserSettings,
} from "./user-settings.service";

describe("user-settings.service", () => {
  it("loads, ensures, and updates the user timezone", async () => {
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { user_id: "user-1", timezone: "Europe/Rome" },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { user_id: "user-1", timezone: "America/New_York" },
              error: null,
            }),
          })),
        })),
      })),
    }));

    const supabase = { from } as never;

    await expect(getUserSettings(supabase, "user-1")).resolves.toMatchObject({
      success: false,
      error: "NOT_FOUND",
    });

    await expect(ensureUserSettings(supabase, "user-1", "Europe/Rome")).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });

    await expect(updateUserSettings(supabase, "user-1", { timezone: "America/New_York" })).resolves.toMatchObject({
      success: true,
      settings: { timezone: "America/New_York" },
    });
  });
});
```

Create `app/_features/user-settings/lib/user-settings-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  ensureUserSettings,
  getUserSettings,
  updateUserSettings,
} from "./user-settings-client";

describe("user-settings client", () => {
  it("loads, ensures, and updates the timezone", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({
          success: true,
          settings: { timezone: "Europe/Rome" },
        }), { status: 200 });
      }

      if (init?.method === "PATCH") {
        return new Response(JSON.stringify({
          success: true,
          settings: { timezone: "America/New_York" },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({
        success: true,
        settings: { timezone: "Europe/Rome" },
      }), { status: 200 });
    }));

    await expect(getUserSettings()).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });

    await expect(ensureUserSettings("Europe/Rome")).resolves.toMatchObject({
      success: true,
      settings: { timezone: "Europe/Rome" },
    });

    await expect(updateUserSettings({ timezone: "America/New_York" })).resolves.toMatchObject({
      success: true,
      settings: { timezone: "America/New_York" },
    });
  });
});
```

- [x] **Step 2: Run the failing tests**

Run:

```bash
npm run test -- app/_features/user-settings/server/user-settings.service.test.ts app/_features/user-settings/lib/user-settings-client.test.ts
```

Expected: FAIL because the feature files do not exist yet.

- [x] **Step 3: Implement schemas, service, handlers, and client**

Create `app/_features/user-settings/lib/user-settings.schemas.ts`:

```ts
import { z } from "zod";

export const timezoneSchema = z.string().trim().min(1).max(120);

export const userSettingsSchema = z.object({
  userId: z.string().trim().min(1),
  timezone: timezoneSchema,
});

export const userSettingsPatchSchema = z.object({
  timezone: timezoneSchema,
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
export type UserSettingsPatch = z.infer<typeof userSettingsPatchSchema>;
```

Create `app/_features/user-settings/server/user-settings.service.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_server/supabase/database.types";
import { userSettingsPatchSchema, userSettingsSchema, type UserSettingsPatch } from "../lib/user-settings.schemas";

type UserSettingsSupabase = SupabaseClient<Database>;

type UserSettingsResult<T extends object> =
  | ({ success: true } & T)
  | { success: false; error: "LOAD_FAILED" | "NOT_FOUND" | "UPDATE_FAILED" | "ENSURE_FAILED"; message: string };

function normalizeRow(row: { user_id: string; timezone: string }) {
  return userSettingsSchema.parse({
    userId: row.user_id,
    timezone: row.timezone,
  });
}

export async function getUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
): Promise<UserSettingsResult<{ settings: ReturnType<typeof normalizeRow> }>> {
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { success: false, error: "LOAD_FAILED", message: error.message };
  if (!data) return { success: false, error: "NOT_FOUND", message: "User settings not found." };
  return { success: true, settings: normalizeRow(data) };
}

export async function ensureUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
  timezone: string,
): Promise<UserSettingsResult<{ settings: ReturnType<typeof normalizeRow> }>> {
  const existing = await getUserSettings(supabase, userId);
  if (existing.success) return existing;
  if (existing.error !== "NOT_FOUND") return existing;

  const { data, error } = await supabase
    .from("user_settings")
    .insert({ user_id: userId, timezone: timezone.trim() })
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: "ENSURE_FAILED", message: error?.message ?? "Unable to ensure user settings." };
  }

  return { success: true, settings: normalizeRow(data) };
}

export async function updateUserSettings(
  supabase: UserSettingsSupabase,
  userId: string,
  patch: UserSettingsPatch,
): Promise<UserSettingsResult<{ settings: ReturnType<typeof normalizeRow> }>> {
  const parsed = userSettingsPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { success: false, error: "UPDATE_FAILED", message: parsed.error.message };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .update({ timezone: parsed.data.timezone })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    return { success: false, error: "UPDATE_FAILED", message: error?.message ?? "Unable to update user settings." };
  }

  return { success: true, settings: normalizeRow(data) };
}
```

Create `app/_features/user-settings/server/user-settings-route.handlers.ts`:

```ts
import type { AuthContext } from "@/app/_server/http/auth";
import { jsonError, jsonOk } from "@/app/_server/http/responses";
import { getZodErrorMessage } from "@/app/_server/http/zod";
import { userSettingsEnsureBodySchema, userSettingsPatchBodySchema } from "./user-settings-route.schemas";
import { ensureUserSettings, getUserSettings, updateUserSettings } from "./user-settings.service";

export async function handleGetUserSettings(auth: AuthContext) {
  const result = await getUserSettings(auth.supabase, auth.userId);
  if (!result.success) {
    return jsonError(result.error === "NOT_FOUND" ? 404 : 500, {
      error: result.error,
      message: result.message,
    });
  }

  return jsonOk({ success: true, settings: result.settings });
}

export async function handleEnsureUserSettings(auth: AuthContext, body: unknown) {
  const parsed = userSettingsEnsureBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, { error: "INVALID_PAYLOAD", message: getZodErrorMessage(parsed.error) });
  }

  const result = await ensureUserSettings(auth.supabase, auth.userId, parsed.data.timezone);
  if (!result.success) {
    return jsonError(500, { error: result.error, message: result.message });
  }

  return jsonOk({ success: true, settings: result.settings });
}

export async function handlePatchUserSettings(auth: AuthContext, body: unknown) {
  const parsed = userSettingsPatchBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonError(400, { error: "INVALID_PAYLOAD", message: getZodErrorMessage(parsed.error) });
  }

  const result = await updateUserSettings(auth.supabase, auth.userId, parsed.data);
  if (!result.success) {
    return jsonError(500, { error: result.error, message: result.message });
  }

  return jsonOk({ success: true, settings: result.settings });
}
```

Create `app/_features/user-settings/lib/user-settings-client.ts` with the same response parsing pattern used in `reel-settings-client.ts`, targeting `/api/user/settings` for `GET`, `POST`, and `PATCH`.

Create `app/_features/user-settings/index.ts`:

```ts
export * from "./lib/user-settings-client";
export * from "./lib/user-settings.schemas";
export * from "./server/user-settings-route.handlers";
export * from "./server/user-settings-route.schemas";
export * from "./server/user-settings.service";
```

- [x] **Step 4: Re-run the feature tests**

Run:

```bash
npm run test -- app/_features/user-settings/server/user-settings.service.test.ts app/_features/user-settings/lib/user-settings-client.test.ts app/_features/user-settings/server/user-settings-route.handlers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the feature boundary**

```bash
git add app/_features/user-settings
git commit -m "feat: add user settings feature boundary"
```

---

### Task 3: Add the `/api/user/settings` route, bootstrap seeding, and settings UI

**Files:**
- Create: `app/api/user/settings/route.ts`
- Modify: `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- Modify: `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`
- Modify: `app/design/organisms/auth/SettingsPanel.tsx`
- Modify: `app/design/auth-ui.test.tsx`

- [x] **Step 1: Write the failing route/UI/bootstrap tests**

Add route-handler assertions to `app/_features/user-settings/server/user-settings-route.handlers.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  getUserSettings: vi.fn(),
  ensureUserSettings: vi.fn(),
  updateUserSettings: vi.fn(),
}));

vi.mock("./user-settings.service", () => serviceMocks);
```

Then assert:

```ts
const response = await handleEnsureUserSettings(auth, { timezone: "Europe/Rome" });
await expect(response.json()).resolves.toMatchObject({
  success: true,
  settings: { timezone: "Europe/Rome" },
});
```

Update `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx` to mock the new client:

```ts
vi.mock("@/app/_features/user-settings", () => ({
  ensureUserSettings: vi.fn(),
}));
```

And assert:

```ts
expect(ensureUserSettings).toHaveBeenCalledWith(timezone);
expect(getProgressionStatus).toHaveBeenCalledWith();
```

Update `app/design/auth-ui.test.tsx` to expect a timezone section and save flow:

```ts
expect(screen.getByText("Timezone")).toBeInTheDocument();
fireEvent.change(screen.getByLabelText("Timezone"), {
  target: { value: "America/New_York" },
});
fireEvent.click(screen.getByRole("button", { name: "Salva timezone" }));
expect(authUiMocks.updateUserSettings).toHaveBeenCalledWith({
  timezone: "America/New_York",
});
```

- [x] **Step 2: Run the failing tests**

Run:

```bash
npm run test -- app/design/templates/app-shell/AppShellProgressionProvider.test.tsx app/design/auth-ui.test.tsx app/_features/user-settings/server/user-settings-route.handlers.test.ts
```

Expected: FAIL because the route and UI do not use user settings yet.

- [x] **Step 3: Implement the route and UI/bootstrap changes**

Create `app/api/user/settings/route.ts`:

```ts
import { NextRequest } from "next/server";
import { getAuthContext, jsonError } from "@/app/_server";
import {
  handleEnsureUserSettings,
  handleGetUserSettings,
  handlePatchUserSettings,
} from "@/app/_features/user-settings";

function getRouteError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function withAuth() {
  const auth = await getAuthContext();
  return auth ?? jsonError(401, {
    error: "UNAUTHORIZED",
    message: "User is not authenticated.",
  });
}

export async function GET() {
  const authOrResponse = await withAuth();
  if (authOrResponse instanceof Response) return authOrResponse;
  return handleGetUserSettings(authOrResponse);
}

export async function POST(request: NextRequest) {
  const authOrResponse = await withAuth();
  if (authOrResponse instanceof Response) return authOrResponse;
  const body = await request.json().catch(() => ({}));
  return handleEnsureUserSettings(authOrResponse, body);
}

export async function PATCH(request: NextRequest) {
  const authOrResponse = await withAuth();
  if (authOrResponse instanceof Response) return authOrResponse;
  const body = await request.json().catch(() => ({}));
  return handlePatchUserSettings(authOrResponse, body);
}
```

Update `app/design/templates/app-shell/AppShellProgressionProvider.tsx`:

```tsx
import { ensureUserSettings } from "@/app/_features/user-settings";
import { getProgressionStatus } from "@/app/_features/progression/lib/progression-client";

async function loadStatus(): Promise<void> {
  const browserTimezone = getBrowserTimezone();
  const ensured = await ensureUserSettings(browserTimezone);

  if (!ensured.success || isCancelled) {
    return;
  }

  const persistedTimezone = ensured.settings.timezone;
  const statusResult = await getProgressionStatus();
  if (isCancelled || !statusResult.success) {
    return;
  }

  setHasProgressionDeadlineWarning(statusResult.status === "WARNING");
  timeoutId = setTimeout(() => {
    void loadStatus();
  }, getMillisecondsUntilNextLocalMidnight(persistedTimezone));
}
```

Update `app/design/organisms/auth/SettingsPanel.tsx` to load and edit timezone:

```tsx
const [timezone, setTimezone] = useState("");
const [isSavingTimezone, setIsSavingTimezone] = useState(false);

useEffect(() => {
  void getUserSettings().then((result) => {
    if (result.success) {
      setTimezone(result.settings.timezone);
    }
  });
}, []);

async function handleSaveTimezone() {
  setIsSavingTimezone(true);
  const result = await updateUserSettings({ timezone });
  setIsSavingTimezone(false);
  if (result.success) {
    setTimezone(result.settings.timezone);
  }
}
```

And render:

```tsx
<AppPanel as="section" variant="overlay">
  <SettingsSectionHeader
    title="Timezone"
    description="Fuso orario usato per automazioni, progression e logiche locali."
  />
  <label className="flex flex-col gap-2 text-sm text-foreground">
    <span>Timezone</span>
    <input
      aria-label="Timezone"
      className="ui-input"
      value={timezone}
      onChange={(event) => setTimezone(event.target.value)}
      placeholder="Europe/Rome"
    />
  </label>
  <Button
    variant="secondary"
    type="button"
    onClick={() => void handleSaveTimezone()}
    disabled={isSavingTimezone}
  >
    {isSavingTimezone ? "Salvataggio..." : "Salva timezone"}
  </Button>
</AppPanel>
```

- [x] **Step 4: Re-run the route/UI/bootstrap tests**

Run:

```bash
npm run test -- app/design/templates/app-shell/AppShellProgressionProvider.test.tsx app/design/auth-ui.test.tsx app/_features/user-settings/server/user-settings-route.handlers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the settings surface**

```bash
git add app/api/user/settings/route.ts app/design/templates/app-shell/AppShellProgressionProvider.tsx app/design/templates/app-shell/AppShellProgressionProvider.test.tsx app/design/organisms/auth/SettingsPanel.tsx app/design/auth-ui.test.tsx
git commit -m "feat: add timezone settings API and UI"
```

---

### Task 4: Refactor progression to read timezone from `user_settings`

**Files:**
- Modify: `app/_features/progression/lib/progression-client.ts`
- Modify: `app/_features/progression/lib/progression-client.test.ts`
- Modify: `app/_features/progression/server/progression-route.schemas.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.test.ts`
- Modify: `app/_features/progression/server/progression.service.ts`
- Modify: `app/_features/progression/server/progression.service.test.ts`
- Modify: `app/_features/progression/index.ts`
- Modify: `app/api/progression/profile/route.ts`
- Modify: `app/api/progression/status/route.ts`

- [x] **Step 1: Write the failing progression tests for the new source of truth**

Update `app/_features/progression/server/progression.service.test.ts` to mock a `user_settings` lookup instead of reading `profile.timezone`:

```ts
expect(supabase.from).toHaveBeenCalledWith("user_settings");
await expect(getProgressionToday(supabase, userId)).resolves.toMatchObject({
  success: true,
  today: { timezone: "Europe/Rome" },
});
```

Update `app/_features/progression/server/progression-route.handlers.test.ts` so status no longer requires a payload:

```ts
serviceMocks.getProgressionStatus.mockResolvedValueOnce({
  success: true,
  status: "OK",
});
const okResponse = await handleGetProgressionStatus(auth);
await expect(okResponse.json()).resolves.toEqual({
  success: true,
  status: "OK",
});
```

Update `app/_features/progression/lib/progression-client.test.ts`:

```ts
const status = await getProgressionStatus();
expect(fetchMock).toHaveBeenCalledWith("/api/progression/status", undefined);

const removedEnsure = await ensureProgressionProfile("Europe/Rome");
expect(removedEnsure.success).toBe(false);
```

- [x] **Step 2: Run the failing progression tests**

Run:

```bash
npm run test -- app/_features/progression/server/progression.service.test.ts app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts
```

Expected: FAIL because progression still depends on request/body timezone and `progression_profiles.timezone`.

- [x] **Step 3: Implement the progression refactor**

In `app/_features/progression/server/progression.service.ts`, add a helper:

```ts
async function getUserTimezone(
  supabase: ProgressionSupabase,
  userId: string,
): Promise<ProgressionResult<{ timezone: string }>> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: getErrorMessage(error, "User settings load failed.") };
  }

  if (!data?.timezone) {
    return { success: false, error: "User timezone not found." };
  }

  return { success: true, timezone: data.timezone };
}
```

Refactor `getProfile` and `ensureProgressionProfile`:

```ts
async function getProfile(
  supabase: ProgressionSupabase,
  userId: string,
): Promise<ProgressionResult<{ profile: ProgressionProfileRow }>> {
  const { data, error } = await supabase
    .from("progression_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { success: false, error: getErrorMessage(error, "Profile load failed.") };
  }

  if (!data) {
    return ensureProgressionProfile(supabase);
  }

  return { success: true, profile: data as ProgressionProfileRow };
}

export async function ensureProgressionProfile(
  supabase: ProgressionSupabase,
): Promise<ProgressionResult<{ profile: ProgressionProfileRow }>> {
  const { data, error } = await supabase.rpc("progression_ensure_profile");
  if (error || !data) {
    return { success: false, error: getErrorMessage(error, "Profile creation failed.") };
  }
  return { success: true, profile: data as ProgressionProfileRow };
}
```

Use `getUserTimezone` anywhere progression needs current-local calculations:

```ts
const profileResult = await getProfile(supabase, userId);
if (!profileResult.success) return profileResult;

const timezoneResult = await getUserTimezone(supabase, userId);
if (!timezoneResult.success) return timezoneResult;

const dateContext = getDateContext(timezoneResult.timezone, options.today);
```

For check-ins:

```ts
const timezoneResult = await getUserTimezone(supabase, userId);
const today = getLocalDateForTimezone(new Date(), timezoneResult.timezone);

await supabase.rpc("progression_create_checkin", {
  p_action_id: actionId,
  p_local_date: today,
  p_timezone: timezoneResult.timezone,
  p_description: `Check-in: ${actionResult.action.title}`,
});
```

Update `app/_features/progression/server/progression-route.handlers.ts`:

```ts
export async function handleGetProgressionStatus(auth: AuthContext) {
  const result = await getProgressionStatus(auth.supabase, auth.userId);
  if (!result.success) {
    return jsonError(500, {
      error: "EXECUTION_ERROR",
      message: result.error,
    });
  }

  return jsonOk({
    success: true,
    status: result.status,
  });
}
```

Update `app/api/progression/status/route.ts` so `POST` no longer parses a body, or convert the endpoint to `GET` and update the client accordingly. Prefer the simpler GET shape:

```ts
export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return getProgressionUnauthorizedResponse();
  }

  return handleGetProgressionStatus(auth);
}
```

Delete or repurpose `app/api/progression/profile/route.ts`. The simplest outcome is to remove this route entirely once no client calls it.

Update `app/_features/progression/lib/progression-client.ts`:

```ts
export async function getProgressionStatus(): Promise<ProgressionClientResult<ProgressionStatusResponse>> {
  return runProgressionRequest(
    fetch("/api/progression/status"),
    (data) => data.status ? { status: data.status } : null,
    "GET_PROGRESSION_STATUS_FAILED",
    "Progression status response is invalid.",
  );
}
```

And delete the exported `ensureProgressionProfile` client helper.

- [x] **Step 4: Re-run the progression tests**

Run:

```bash
npm run test -- app/_features/progression/server/progression.service.test.ts app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the progression refactor**

```bash
git add app/_features/progression app/api/progression/status/route.ts app/design/templates/app-shell/AppShellProgressionProvider.tsx app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
git commit -m "refactor: read progression timezone from user settings"
```

---

### Task 5: Make reel scheduling timezone-aware through `user_settings`

**Files:**
- Modify: `app/_features/academy/reels/server/reel-worker.service.ts`
- Modify: `app/_features/academy/reels/server/reel-worker.service.test.ts`

- [x] **Step 1: Write the failing scheduler test**

Add this test to `app/_features/academy/reels/server/reel-worker.service.test.ts`:

```ts
it("matches run times in the persisted user timezone", async () => {
  const insertedJobs: Array<{ userId: string; reelId: string; runAt: string }> = [];

  const enqueued = await enqueueScheduledIdeaReels({} as never, {
    listJobs: vi.fn().mockResolvedValue([]),
    listSettings: vi.fn().mockResolvedValue([
      {
        user_id: "user-1",
        config: { enabled: true, runTimes: ["09:15"] },
        timezone: "Europe/Rome",
      },
    ]),
    listIdeaReelIds: vi.fn().mockResolvedValue(["reel-1"]),
    listActiveQueueReelIds: vi.fn().mockResolvedValue([]),
    hasJobForSlot: vi.fn().mockResolvedValue(false),
    insertScheduledJobs: vi.fn(async (_supabase, jobs) => {
      insertedJobs.push(...jobs);
    }),
    updateJob: vi.fn().mockResolvedValue({ error: null }),
    generateGlobal: vi.fn().mockResolvedValue({ success: true }),
    generateField: vi.fn().mockResolvedValue({ success: true }),
    insertLog: vi.fn().mockResolvedValue(undefined),
    now: () => new Date("2026-05-13T07:15:05.000Z"),
  });

  expect(enqueued).toBe(1);
  expect(insertedJobs[0]?.runAt).toBe("2026-05-13T07:15:00.000Z");
});
```

- [x] **Step 2: Run the failing scheduler test**

Run:

```bash
npm run test -- app/_features/academy/reels/server/reel-worker.service.test.ts
```

Expected: FAIL because the worker currently compares run times in UTC only.

- [x] **Step 3: Refactor the worker to use persisted user timezone**

Update the row shape in `app/_features/academy/reels/server/reel-worker.service.ts`:

```ts
interface GenerationSettingsRowLike {
  user_id: string;
  config: unknown;
  timezone?: string;
}
```

Update the repository dependency or `listSettings` result so each row carries the persisted timezone from `user_settings`. If the existing repository layer does not expose it yet, make `listSettings` return a join result or load it in the service before due-time evaluation.

Replace UTC-only helpers with timezone-aware versions:

```ts
function getTimePartsInTimezone(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return parts as Record<string, string>;
}

function isDueForRunTime(now: Date, runTime: string, timezone: string): boolean {
  const parts = getTimePartsInTimezone(now, timezone);
  const [scheduledHour, scheduledMinute] = runTime.split(":");
  return parts.hour === scheduledHour && parts.minute === scheduledMinute;
}
```

Use the row timezone when computing due slots:

```ts
const timezone = row.timezone ?? "UTC";
const dueRunTimes = settings.runTimes.filter((runTime) =>
  isDueForRunTime(now, runTime, timezone),
);
```

If you need to compute the stored `run_at`, derive the UTC instant for that user-local slot before inserting jobs and keep the de-duplication check using that UTC timestamp.

- [x] **Step 4: Re-run the worker tests**

Run:

```bash
npm run test -- app/_features/academy/reels/server/reel-worker.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the scheduler change**

```bash
git add app/_features/academy/reels/server/reel-worker.service.ts app/_features/academy/reels/server/reel-worker.service.test.ts
git commit -m "feat: use user timezone for reel scheduling"
```

---

### Task 6: Update docs and run final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/progression-system-spec.md`

- [x] **Step 1: Update the documentation**

In `docs/progression-system-spec.md`, replace progression-owned timezone text with user-settings-owned timezone text. Update sections like:

```md
- The authenticated app shell ensures the profile using the browser timezone on mount; a dedicated timezone settings editor is outside v1.
```

to:

```md
- The authenticated app shell ensures `user_settings.timezone` from the browser on first authenticated mount.
- The user can later edit timezone in `/settings`.
- Progression reads timezone from `user_settings` and does not own it.
```

In `README.md`, add one short note in the settings/app-shell/progression sections:

```md
- `/settings` now includes the per-user timezone preference used by progression and automation scheduling.
```

- [x] **Step 2: Run targeted tests for all touched areas**

Run:

```bash
npm run test -- app/_features/user-settings/server/user-settings.service.test.ts app/_features/user-settings/server/user-settings-route.handlers.test.ts app/_features/user-settings/lib/user-settings-client.test.ts app/_features/progression/server/progression.service.test.ts app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/_features/academy/reels/server/reel-worker.service.test.ts app/design/auth-ui.test.tsx app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
```

Expected: PASS.

- [x] **Step 3: Run lint and typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Browser verification**

Run the app and verify manually:

```bash
npm run dev
```

Manual checks:
- sign in and open `/settings`
- confirm the current timezone loads
- change timezone and save
- refresh `/settings` and confirm it persists
- open `/progression` and confirm today/deadline behavior still loads
- let the app shell mount and confirm no errors when it seeds or reads timezone

- [x] **Step 5: Commit docs and verification-ready state**

```bash
git add README.md docs/progression-system-spec.md
git commit -m "docs: update timezone ownership documentation"
```

---

## Self-Review

### Spec coverage

- `user_settings` table: covered in Task 1.
- first-entry browser seed: covered in Task 3.
- `/settings` manual editing: covered in Task 3.
- progression ownership move: covered in Task 4.
- reel scheduling dependency on user timezone: covered in Task 5.
- docs updates: covered in Task 6.

### Placeholder scan

- No `TBD`, `TODO`, or “similar to previous task” placeholders remain.
- Every task lists concrete files, commands, and code direction.

### Type consistency

- Current preference object is consistently named `settings`.
- Current timezone field is consistently named `timezone`.
- Progression still keeps historical `p_timezone` RPC args for check-in snapshots, while profile ensure drops the seed arg.

## Suggested Commit Sequence

1. `feat: move timezone ownership to user settings`
2. `feat: add user settings feature boundary`
3. `feat: add timezone settings API and UI`
4. `refactor: read progression timezone from user settings`
5. `feat: use user timezone for reel scheduling`
6. `docs: update timezone ownership documentation`
