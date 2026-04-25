# Dashboard Shell Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents are available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated `/assistant` landing flow with a protected `/dashboard` shell that provides a fixed sidebar, a compact sticky topbar, and real sibling routes for the next Personal OS sections.

**Architecture:** Build a shared authenticated shell under `app/(app-shell)` so `/dashboard`, `/settings`, and the future sibling sections reuse one layout without changing their public URLs. Keep `/`, `/assistant`, and `/setup/calendar` standalone, drive sidebar labels/titles from one navigation config, and keep desktop/mobile shell behavior inside dedicated UI components so route pages remain thin.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Vitest, React Testing Library.

---

## Agreed Scope

- New protected landing page: `/dashboard`
- Protected sibling routes: `/projects`, `/academy`, `/reflections`, `/learning`, `/progression`, `/news`, `/settings`
- Shared shell behavior:
  - fixed desktop sidebar with width `224px`
  - mobile drawer below Tailwind `md`
  - compact sticky topbar above the content column only
  - overall shell height locked to the visible viewport (`100dvh`)
  - page-level scrolling only inside the sidebar middle area and the content column
- Sidebar rules:
  - three zones: clickable brand, scrollable nav, bottom settings action
  - labels in Italian
  - `Dashboard` and `Impostazioni` are interactive
  - future sections are visible, disabled, show a `Presto` badge, and still appear active when their route is opened directly
- Content rules:
  - `Dashboard` page content is only a link to `/setup/calendar`
  - no duplicate page title inside the content area
  - `/settings` keeps the current account/logout content and removes the link to `/assistant`
- Auth and routing rules:
  - authenticated `/` redirects to `/dashboard`
  - unauthenticated access to protected routes redirects to `/?next=<original-path>`
  - login from `/` defaults to `/dashboard`
  - direct access to `/assistant` must still return to `/assistant` after login
  - `/setup/calendar` remains protected and standalone outside the new shell
- Explicit non-scope for this plan:
  - assistant orb integration
  - voice/session lifecycle changes
  - section-specific business features beyond placeholder pages

## File Map

**Create**
- `app/(app-shell)/layout.tsx`
- `app/(app-shell)/dashboard/page.tsx`
- `app/(app-shell)/projects/page.tsx`
- `app/(app-shell)/academy/page.tsx`
- `app/(app-shell)/reflections/page.tsx`
- `app/(app-shell)/learning/page.tsx`
- `app/(app-shell)/progression/page.tsx`
- `app/(app-shell)/news/page.tsx`
- `app/(app-shell)/settings/page.tsx`
- `app/_features/navigation/app-shell-navigation.ts`
- `app/design/templates/app-shell/AppShellTemplate.tsx`
- `app/design/organisms/navigation/AppSidebar.tsx`
- `app/design/organisms/navigation/AppTopbar.tsx`
- `app/design/organisms/navigation/AppMobileSidebar.tsx`
- `app/design/app-shell-ui.test.tsx`

**Modify**
- `proxy.ts`
- `app/auth/callback/route.ts`
- `app/design/index.ts`
- `app/design/templates/auth/LoginTemplate.tsx`
- `app/design/molecules/auth/LoginCard.tsx`
- `app/design/organisms/auth/SettingsPanel.tsx`
- `app/design/auth-ui.test.tsx`
- `app/api/core-routes.test.ts`
- `README.md`

**Delete / Replace**
- `app/settings/page.tsx` once `/settings` is served from `app/(app-shell)/settings/page.tsx`

### Task 1: Add the authenticated route-group shell entrypoints

**Files**
- Create: `app/(app-shell)/layout.tsx`
- Create: `app/(app-shell)/dashboard/page.tsx`
- Create: `app/(app-shell)/projects/page.tsx`
- Create: `app/(app-shell)/academy/page.tsx`
- Create: `app/(app-shell)/reflections/page.tsx`
- Create: `app/(app-shell)/learning/page.tsx`
- Create: `app/(app-shell)/progression/page.tsx`
- Create: `app/(app-shell)/news/page.tsx`
- Create: `app/(app-shell)/settings/page.tsx`
- Delete/replace: `app/settings/page.tsx`

- [x] Create `app/(app-shell)/layout.tsx` as the shared authenticated shell layout entrypoint.
- [x] Move `/settings` into the route group so the public URL stays `/settings` while the page starts using the shared shell.
- [x] Add real route entrypoints for `/dashboard`, `/projects`, `/academy`, `/reflections`, `/learning`, `/progression`, and `/news`.
- [x] Keep each route page thin by delegating layout concerns to the shared shell template.
- [x] Ensure `/assistant`, `/`, and `/setup/calendar` remain outside the route group and untouched by the new layout.

### Task 2: Build one source of truth for navigation metadata and shell structure

**Files**
- Create: `app/_features/navigation/app-shell-navigation.ts`
- Create: `app/design/templates/app-shell/AppShellTemplate.tsx`
- Create: `app/design/organisms/navigation/AppSidebar.tsx`
- Create: `app/design/organisms/navigation/AppTopbar.tsx`
- Modify: `app/design/index.ts`

- [x] Create `app/_features/navigation/app-shell-navigation.ts` with the exact section metadata: href, Italian label, enabled/disabled state, and title text for the topbar.
- [x] Build `AppSidebar` with three zones: brand (`Jarvis` + `Personal OS`), middle nav, and bottom `Impostazioni` action.
- [x] Implement the desktop sidebar with fixed width `224px`, current look-and-feel styling, visible active state, and `Presto` badges for disabled sections.
- [x] Build `AppTopbar` as a compact sticky bar that renders only above the content column and reads the current section title from the shared navigation config.
- [x] Export the new shell pieces through `app/design/index.ts` only if needed by route entrypoints.

### Task 3: Add the mobile drawer and scroll-lock behavior

**Files**
- Modify: `app/design/templates/app-shell/AppShellTemplate.tsx`
- Create: `app/design/organisms/navigation/AppMobileSidebar.tsx`

- [x] Make `AppShellTemplate` a client shell wrapper responsible for mobile drawer state only.
- [x] Apply Tailwind `md` as the breakpoint where desktop fixed sidebar switches to mobile drawer behavior.
- [x] Implement the mobile sidebar as an overlay drawer with backdrop, current visual language, and the same navigation content as desktop.
- [x] Close the mobile drawer when the user clicks the backdrop, presses `Escape`, or completes a navigation with an interactive item.
- [x] Lock body scrolling while the drawer is open and restore it on close/unmount.
- [x] Keep the overall shell height constrained to `100dvh`, with overflow isolated to the sidebar middle area and the content column.

### Task 4: Wire the dashboard, settings, and auth redirect flow

**Files**
- Modify: `proxy.ts`
- Modify: `app/auth/callback/route.ts`
- Modify: `app/design/templates/auth/LoginTemplate.tsx`
- Modify: `app/design/molecules/auth/LoginCard.tsx`
- Modify: `app/design/organisms/auth/SettingsPanel.tsx`
- Modify: `app/(app-shell)/dashboard/page.tsx`
- Modify: `app/(app-shell)/settings/page.tsx`

- [x] Change `proxy.ts` so authenticated `/` redirects to `/dashboard` instead of `/assistant`.
- [x] Extend `proxy.ts` protection to `/dashboard`, `/projects`, `/academy`, `/reflections`, `/learning`, `/progression`, and `/news`, while keeping `/assistant`, `/settings`, and `/setup/calendar` protected too.
- [x] Preserve the originally requested protected path in the login redirect query (`next`) so deep links return to the requested route after auth.
- [x] Update `app/auth/callback/route.ts` so the fallback redirect aligns with `/dashboard` when `next` is missing.
- [x] Update the login flow UI so the root login CTA defaults to `/dashboard` but still respects `next` from the query string.
- [x] Reuse the existing settings content inside the new shell and remove the visible link back to `/assistant`.
- [x] Keep the dashboard content minimal: no duplicate heading in the content area, only the visible link to `/setup/calendar`.

### Task 5: Update the documentation

**Files**
- Modify: `README.md`

- [x] Update the product overview so the authenticated default route is `/dashboard`, not `/assistant`.
- [x] Update the architecture map in `README.md` to mention the shared authenticated shell and the new sibling section routes.
- [x] Document that `/assistant` remains a legacy standalone route not exposed in the main UI.
- [x] Document that `/setup/calendar` stays standalone and protected, with discovery currently exposed from the dashboard.

### Task 6: Add or update tests and run verification

**Files**
- Create: `app/design/app-shell-ui.test.tsx`
- Modify: `app/design/auth-ui.test.tsx`
- Modify: `app/api/core-routes.test.ts`

- [x] Add `app/design/app-shell-ui.test.tsx` to cover:
  - desktop shell rendering
  - active nav item styling
  - disabled nav items with `Presto`
  - compact sticky topbar title selection
  - direct placeholder route state showing the section as active even when disabled
- [x] Update `app/design/auth-ui.test.tsx` so login uses `/dashboard` by default and settings no longer exposes an `/assistant` link.
- [x] Extend `app/api/core-routes.test.ts` to verify:
  - authenticated `/` redirects to `/dashboard`
  - protected new routes redirect unauthenticated users to `/?next=...`
  - direct `/assistant` login return still resolves back to `/assistant`
  - `/setup/calendar` remains protected
- [x] Run targeted tests first:
  - `npm run test -- app/design/app-shell-ui.test.tsx app/design/auth-ui.test.tsx app/api/core-routes.test.ts`
- [x] Run full verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
- [x] If verification reveals layout edge cases around mobile scroll locking or route-group redirects, fix them before considering the shell foundation complete.
