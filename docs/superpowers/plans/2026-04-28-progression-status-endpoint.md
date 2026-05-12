# Progression Status Endpoint Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are explicitly requested by the user) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app-shell progression overview fetch with a dedicated status endpoint that returns `OK` or `WARNING`, while keeping the existing sidebar UI and progression page unchanged for now.

**Architecture:** Add a small server contract for progression status and switch the app-shell progression provider to call it instead of `GET /api/progression`. The server should determine whether any expired open goals exist and return only the minimal status enum; the client maps `WARNING` to the existing sidebar badge boolean and keeps the midnight refresh logic intact. This is a narrow change: no page refactor, no shell split, and no progression section loading changes yet.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5 strict mode, Supabase, Zod, Vitest, Testing Library.

---

## Scope Check

One subsystem only: add a dedicated progression status fetch and swap the app-shell provider over to it. Do not refactor the progression page, its sections, or the shell composition beyond the status call.

## File Structure Map

**Create**
- `app/api/progression/status/route.ts`

**Modify**
- `app/_features/progression/server/progression.types.ts`
- `app/_features/progression/server/progression-route.schemas.ts`
- `app/_features/progression/server/progression.service.ts`
- `app/_features/progression/server/progression-route.handlers.ts`
- `app/_features/progression/index.ts`
- `app/_features/progression/lib/progression-client.ts`
- `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- `app/_features/progression/server/progression-route.handlers.test.ts`
- `app/_features/progression/lib/progression-client.test.ts`
- `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`
- `app/api/core-routes.test.ts`

No README or product docs updates are expected for this change because the visible behavior stays the same.

---

### Task 1: Add the Progression Status Contract and Route

**Files:**
- Modify: `app/_features/progression/server/progression.types.ts`
- Modify: `app/_features/progression/server/progression-route.schemas.ts`
- Modify: `app/_features/progression/server/progression.service.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.ts`
- Modify: `app/_features/progression/index.ts`
- Create: `app/api/progression/status/route.ts`
- Modify: `app/_features/progression/server/progression-route.handlers.test.ts`
- Modify: `app/api/core-routes.test.ts`

- [x] **Step 1: Write the failing handler and route tests**

Add tests that prove the new contract is tiny and explicit:

```ts
expect(await handleGetProgressionStatus(auth, { timezone: "Europe/Rome" })).toEqual({
  success: true,
  status: "OK",
});
```

Cover both cases:

- no expired open goals returns `OK`
- at least one expired open goal returns `WARNING`

Also add an API routing test for the new `POST /api/progression/status` route.

- [x] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- app/_features/progression/server/progression-route.handlers.test.ts app/api/core-routes.test.ts
```

Expected: fail because the status handler, route, and response schema do not exist yet.

- [x] **Step 3: Implement the minimal server contract**

Implement the smallest possible status flow:

- add a `ProgressionStatus` union type with `OK` and `WARNING`
- add a dedicated status request schema for the browser timezone payload
- add a dedicated status response schema
- add `getProgressionStatus(...)` in `progression.service.ts`
  - ensure the profile with the provided timezone
  - query only the overdue open goals needed for the warning decision
  - return `WARNING` if at least one such goal exists, otherwise `OK`
- add `handleGetProgressionStatus(...)` in `progression-route.handlers.ts`
- export the new handler from `app/_features/progression/index.ts`
- create `app/api/progression/status/route.ts` with a single `POST` handler

Keep the response body as small as possible:

```json
{ "success": true, "status": "OK" }
```

- [x] **Step 4: Run the route and handler tests again**

Run:

```bash
npm run test -- app/_features/progression/server/progression-route.handlers.test.ts app/api/core-routes.test.ts
```

Expected: pass.

- [x] **Step 5: Commit the server-side status endpoint**

Run:

```bash
git add app/_features/progression/server/progression.types.ts app/_features/progression/server/progression-route.schemas.ts app/_features/progression/server/progression.service.ts app/_features/progression/server/progression-route.handlers.ts app/_features/progression/index.ts app/api/progression/status/route.ts app/_features/progression/server/progression-route.handlers.test.ts app/api/core-routes.test.ts
git commit -m "feat: add progression status endpoint"
```

---

### Task 2: Switch the App-Shell Provider to the Status Endpoint

**Files:**
- Modify: `app/_features/progression/lib/progression-client.ts`
- Modify: `app/design/templates/app-shell/AppShellProgressionProvider.tsx`
- Modify: `app/design/templates/app-shell/AppShellProgressionProvider.test.tsx`

- [x] **Step 1: Write failing client and provider tests**

Add test coverage for the new client helper and for the shell provider behavior:

- the client posts the browser timezone to `/api/progression/status`
- the provider makes exactly one status request on mount
- `WARNING` sets `hasProgressionDeadlineWarning` to `true`
- `OK` keeps `hasProgressionDeadlineWarning` `false`
- the midnight refresh still revalidates status instead of fetching the full overview

- [x] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm run test -- app/_features/progression/lib/progression-client.test.ts app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
```

Expected: fail because the client helper and provider still use the overview fetch.

- [x] **Step 3: Replace the overview fetch with the status fetch**

Implement the smallest client-side swap:

- add `getProgressionStatus(timezone)` to `progression-client.ts`
- post the timezone payload to the new status endpoint
- update `AppShellProgressionProvider` to call the status helper once on mount
- keep the existing `openProgressionHistory` bridge untouched
- keep the midnight timer logic intact, but re-run the status fetch instead of loading the full overview
- map `WARNING` to `true` and `OK` to `false` for the existing sidebar badge state

Do not change the sidebar component shape yet. This task is only a data-source swap.

- [x] **Step 4: Run the client and provider tests again**

Run:

```bash
npm run test -- app/_features/progression/lib/progression-client.test.ts app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
```

Expected: pass.

- [x] **Step 5: Commit the provider swap**

Run:

```bash
git add app/_features/progression/lib/progression-client.ts app/design/templates/app-shell/AppShellProgressionProvider.tsx app/design/templates/app-shell/AppShellProgressionProvider.test.tsx app/_features/progression/lib/progression-client.test.ts
git commit -m "feat: use progression status in app shell"
```

---

### Task 3: Verify Routing Coverage and Final Cleanups

**Files:**
- Modify: `app/api/core-routes.test.ts`
- Modify: any test file that needs import or mock updates after the endpoint swap

- [x] **Step 1: Add the route coverage assertion**

Make sure the API routing suite explicitly covers the new status endpoint and that no old overview assumptions are left behind in the shell bootstrap tests.

- [x] **Step 2: Run the relevant test slice**

Run:

```bash
npm run test -- app/api/core-routes.test.ts app/_features/progression/server/progression-route.handlers.test.ts app/_features/progression/lib/progression-client.test.ts app/design/templates/app-shell/AppShellProgressionProvider.test.tsx
```

Expected: pass.

- [x] **Step 3: Run lint and typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both pass without warnings or type errors.

- [x] **Step 4: Commit the final test adjustments**

Run:

```bash
git add app/api/core-routes.test.ts
git commit -m "test: cover progression status routing"
```
