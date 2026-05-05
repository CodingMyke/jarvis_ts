# Progression Visibility and Goal Details Design

## Purpose

Fix the `/progression` page so that:

- the server returns only the actions that should actually be visible now;
- `daily` means "visible again every new local day", not "every 24 hours";
- the client does not decide action visibility;
- full action lists for a single goal are fetched only when the user opens the goal form in `edit` or `duplicate` mode;
- the page refreshes automatically when the user's local day changes, so daily actions reappear at midnight.

This is a data-loading and visibility-boundary change, not a product redesign.

## Scope

In scope:

- server-side computation of visible "today" and weekly action lists;
- a new goal-detail fetch for `edit` and `duplicate`;
- client-side removal of action-frequency filtering from the page workspace;
- midnight refresh scheduling based on the progression timezone;
- tests for the new server contract and the on-demand goal detail flow.

Out of scope:

- database schema changes;
- new progression features;
- visual redesign of the page;
- changes to goal lifecycle rules;
- changes to XP, check-in, or deadline semantics.

## Proposed Architecture

### 1. Overview endpoint becomes page-ready

`GET /api/progression` remains the main page fetch, but the response is reduced to only what the page actually needs.

It returns:

- `profile`
- `goals`
- `todayItems`
- `weeklyItems`
- `levelProgress`
- `deadlineWarning`
- `todayLocalDate`

The server computes `todayItems` and `weeklyItems` before sending the response. The client only renders them.

The overview response does **not** expose raw actions or raw check-ins for the page to re-filter
locally. Each visible item carries the minimal state needed for the checkbox UI, including its
current `checkinId` when one exists.

### 2. Goal detail endpoint is fetched on demand

A new goal-detail request is used for `edit` and `duplicate`.

Contract:

- `GET /api/progression/goals?id=<goalId>`
- returns `{ goal, actions }`

This response is the same payload shape needed to populate the goal form.
The same endpoint is used for both `edit` and `duplicate`.

The main page does not fetch goal actions until the user explicitly opens one of those dialogs.

### 3. Client becomes a renderer and orchestrator

`useProgressionWorkspace` stops deriving action visibility from raw actions.
Instead:

- it reads `todayItems` and `weeklyItems` directly from the overview;
- it fetches goal details only when opening `edit` or `duplicate`;
- it maps the detail payload into the existing goal form draft;
- it keeps the page refreshed at the next local midnight.

The goal form can open in a loading state while the detail request is in flight.

## Server Rules

### Visible action rules

- `daily` actions are visible every local day while active and attached to an open goal.
- `specific_weekdays` actions are visible only on configured ISO weekdays.
- `weekly_count` actions are visible while the weekly target is not yet reached.
- inactive actions are never returned as visible items.
- actions from closed goals are never returned as visible items.

### Date boundary rules

- the progression timezone remains the source of truth for "today";
- day rollover happens at midnight in that timezone;
- the server should treat a new local calendar day as the moment daily actions become visible again.

## Client Rules

- The today panel must never calculate frequency visibility.
- The today panel renders only what the server already marked as visible.
- `edit` and `duplicate` share the same goal-detail fetch and form population path.
- If the page stays open across midnight, it should refresh automatically without user interaction.

## Error Handling

- If the overview fetch fails, the page keeps the existing error state behavior.
- If the goal-detail fetch fails, the dialog should show an inline error and allow retry or close.
- If the midnight refresh fails, the page should keep the last successful data instead of clearing the UI.

## Testing

Add or update tests to cover:

- `daily` actions are visible every day, including immediately after midnight;
- the overview endpoint returns only page-visible items;
- the page workspace no longer performs client-side frequency filtering;
- the goal-detail endpoint returns a full goal plus its actions;
- `edit` and `duplicate` both fetch the same goal-detail payload on demand;
- the refresh timer is scheduled for the next local midnight.

## Acceptance Criteria

- The today panel shows daily actions again as soon as the local day changes.
- The page does not hide daily actions because of a 24-hour elapsed-time check.
- The page receives only the actions meant to be visible now.
- Goal actions are fetched only when opening `edit` or `duplicate`.
- The rest of the page continues to work with the reduced overview payload.
