# Progression System Specification

## Implementation Goal

Build an autonomous progression system inside Jarvis AI. The feature must be owned by
the application and must not reuse or mix with Google Tasks todos.

The system lets a user define goals, optional recurring actions, daily check-ins,
XP rewards, XP penalties, streaks, and levels. It should support small personal
goals first while keeping the domain model clear enough for future voice-assistant
tools and richer goal analytics.

## Product Scope

The first version lives in the existing `/progression` app-shell route.

It includes:

- A today view with due recurring actions and checkboxes.
- A goal list with status filters.
- Goal creation, editing, duplication, soft deletion, starting, completion, and
  deadline review.
- A level panel with total XP, current level, progress toward the next level, and
  XP remaining.
- An XP history sidebar that opens on demand.
- A global app-shell deadline check that marks the Progression navigation item
  with a warning indicator when expired goals need review.

It excludes:

- Google Tasks integration.
- Dashboard widgets.
- Voice assistant tools for progression.
- A dedicated goal detail page.
- Editing historical check-ins.
- Per-goal check-in history UI, which can be added later.

## Core Concepts

### Progression Profile

Each authenticated user has one progression profile, created as soon as the user
enters the authenticated app shell.

Initial values:

- `level = 1`
- `totalXp = 0`
- `timezone` from the browser on first authenticated app entry

The timezone becomes a user preference. It does not change automatically when the
user opens the app from another location. If the user changes it in settings, the
new timezone affects only future calculations.

The profile stores the current total XP and level. XP history remains the audit
log, but it does not duplicate the current total.

### Goals

A goal is the main container. It can be simple or can contain recurring actions.

Goal statuses:

- `to_start`
- `in_progress`
- `completed`
- `failed`

Goal fields:

- `title`, required
- `description`, optional
- `status`
- `deadline`, optional date-only value
- `completionXp`, non-negative
- `startedAt`, optional
- `completedAt`, optional
- `failedAt`, optional
- `deadlineChangeCount`
- `deletedAt`, optional, for soft deletion

The deadline is optional. If present, it is date-only in the user's configured
timezone and remains valid until the end of that local day.

The deadline penalty is not editable. It is always:

```text
floor(completionXp / 3)
```

The form should show this penalty as read-only whenever `completionXp` is visible.

### Recurring Actions

Recurring actions belong to a goal. A goal can have zero, one, or many actions.
Goals with zero actions can still be `in_progress`, completed manually, or failed
by deadline.

Action fields:

- `goalId`
- `title`
- `description`, optional
- `frequencyType`: `daily`, `weekly_count`, or `specific_weekdays`
- `frequencyConfig`
- `xpPerCheckin`, non-negative
- `active`
- `createdAt`
- `deactivatedAt`, optional

Action deletion rules:

- If an action has no check-ins, it can be physically deleted.
- If an action has at least one check-in, it cannot be deleted; it can only be
  deactivated.
- Inactive actions remain visible in the goal form/detail context but never appear
  in today's checklist.

Once an action has at least one check-in, its XP and frequency cannot be changed.
Only non-economic fields such as title and description remain editable.

### Check-Ins

A check-in represents one completed action on one local date.

Check-in fields:

- `actionId`
- `goalId`
- `userId`
- `localDate`
- `timezone`
- `xpAwarded`
- `createdAt`

There must be a unique database constraint for one check-in per action per local
date. Check-in mutations must be idempotent so duplicate requests from multiple
tabs cannot create duplicate XP.

Past dates are read-only:

- The user can add or undo check-ins only for today.
- Past check-ins cannot be added or removed.
- If the user changes timezone during a day, undo eligibility for existing
  check-ins is based on the local date and timezone stored on that check-in.

### XP History

XP history is a simple event log.

Fields:

- `id`
- `userId`
- `xpAmount`
- `description`
- `createdAt`
- `goalId`, nullable
- `actionId`, nullable
- `checkinId`, nullable

`xpAmount` may be positive or negative. User-configured XP values must never be
negative. Negative history rows are system-generated only, such as deadline
penalties or same-day check-in reversals.

No XP history row should be created when the actual XP change is `0`.

Descriptions are immutable snapshots. If a goal or action is renamed later, old XP
history rows keep the original event description.

## Leveling Rules

The minimum level is `1`.

Level is stored on the progression profile but is derived from `totalXp` using the
level formula. Whenever XP changes, the system updates `totalXp` and recalculates
`level`.

XP needed to advance from the current level to the next level:

```text
round(10 * level ^ 1.5)
```

Examples:

- Level 1 to 2: 10 XP
- Level 2 to 3: 28 XP
- Level 3 to 4: 52 XP

XP can never reduce the profile below `0`. The level can go down after penalties,
but never below `1`.

The UI should derive:

- XP inside the current level
- XP required for the next level
- XP remaining until the next level

## Goal Lifecycle Rules

New goals default to `to_start`. The creation form also supports a `start now`
option, which creates the goal as `in_progress` with `startedAt` set to today.

Only goals in `in_progress` generate today's checklist items.

Goal menu actions:

- `start`, only for `to_start`
- `edit`
- `set as completed`, only for open goals
- `duplicate`, available for every status
- `delete`

Closed goals are goals with status `completed` or `failed`.

Closed goal rules:

- Closed goals cannot be reopened.
- Closed goals stop generating recurring actions.
- Closed goals can only have title and description edited.
- Closed goals keep their XP history unchanged.

Completing a goal:

- Is manual.
- Does not require all recurring actions to be perfectly checked in.
- Awards `completionXp` once if `completionXp > 0`.
- Does not create XP history if `completionXp = 0`.

Soft deleting a goal:

- Sets `deletedAt`.
- Hides the goal from normal UI and filters.
- Stops recurring actions from appearing.
- Does not remove check-ins or XP history.
- Does not change total XP.
- Requires confirmation.

Duplicating a goal:

- Opens the creation form prefilled from the selected goal.
- Creates a completely new goal.
- Copies goal fields and recurring action configuration.
- Does not copy check-ins, streaks, XP history, or lifecycle timestamps.

## Deadline Rules

The app checks for expired goals when the authenticated app shell opens.

If expired unresolved goals exist:

- The Progression navigation item shows a yellow warning indicator.
- The app remains usable outside `/progression`.
- When the user enters `/progression`, a blocking deadline review dialog opens.
- The user must resolve each expired goal one by one before using the Progression
  page.

An expired unresolved goal is a non-deleted goal with a deadline in the past and a
status other than `completed` or `failed`.

Deadline review actions:

- Mark as completed: status becomes `completed`, completion XP is awarded if
  greater than `0`.
- Confirm failure: status becomes `failed`, penalty is applied if greater than
  `0`.
- Postpone: available only if `deadlineChangeCount = 0`; sets a new deadline.

Deadline modification:

- A goal deadline can be changed from one existing date to another existing date
  only once.
- Adding a deadline to a goal that did not previously have one does not count as a
  deadline change.
- Deadline changes are done through the edit form, not as a separate goal menu
  action.

Failure penalty:

- Planned penalty is `floor(completionXp / 3)`.
- Applied penalty is `min(totalXp, plannedPenalty)`.
- XP history records the applied penalty only.
- If the applied penalty is `0`, no XP history row is created.

## Frequency Rules

### Daily

`daily` actions are due every day, including weekends.

They appear in the "Due today" subsection when their goal is `in_progress` and
the action is active.

Daily streak counts consecutive completed local days.

### Specific Weekdays

`specific_weekdays` actions are due only on configured weekdays.

They appear in the "Due today" subsection only on those days.

Missed past occurrences cannot be recovered. If a Monday action is missed, it
cannot be checked in on Tuesday.

The streak counts consecutive scheduled occurrences completed. A scheduled
occurrence due today does not break the streak until the next local day.

### Weekly Count

`weekly_count` actions require a target number of distinct check-in days in a
Monday-to-Sunday week.

They appear in a separate "Available this week" subsection until the weekly target
is reached. Once the target is reached, the action disappears until the next week.

Extra check-ins beyond the weekly target are not allowed and do not award XP.

Weekly streak counts consecutive completed weeks where the target was reached.
The current week does not break the streak while there is still time to reach the
target.

If a goal starts mid-week, that week still counts normally. There is no prorated
target.

If a new recurring action is added to an already active goal, it starts from today
and does not create past obligations.

## Today View

The Today section has two subsections:

- Due today: daily actions and specific weekday actions due today.
- Available this week: weekly-count actions whose weekly target has not yet been
  reached.

Each item shows:

- Checkbox
- Action title
- Parent goal context
- XP awarded by the check-in

Checking an item creates a check-in. If `xpPerCheckin > 0`, it also creates a
positive XP history row and updates the progression profile.

Undoing today's check-in removes the check-in and creates a negative XP history
row only when the original check-in awarded XP.

## Goal List

Goal filters:

- In progress
- To start
- Completed
- Failed
- All

The default filter is In progress.

Soft-deleted goals are hidden from all normal filters.

Each goal row has an actions menu on the right with the lifecycle actions allowed
by that goal's state.

## Creation And Editing Form

The same form is used for:

- Creating a new goal
- Editing an existing goal
- Duplicating a goal with prefilled values

Base fields:

- Title
- Description
- Status/start option for creation
- Deadline
- Completion XP
- Read-only computed failure penalty
- Optional recurring actions

For open goals, most fields can be edited, subject to the deadline-change and
action-locking rules.

For closed goals, only title and description can be edited.

## XP History Sidebar

XP history is not always visible. It opens from a history icon/button.

It shows XP gain/loss events using the immutable event description and created
date.

The sidebar reads from XP history, not from check-ins directly.

## Data Integrity Requirements

Important invariants:

- Google Tasks todos are not reused for progression.
- A user has exactly one progression profile.
- `totalXp` never goes below `0`.
- `level` never goes below `1`.
- Check-ins are unique per action and local date.
- XP history is created only for non-zero XP changes.
- Closed goals are not reopened.
- Soft-deleted goals do not affect existing XP.
- Deadline penalty values are calculated, not user editable.
- Past check-ins cannot be changed.
- Action XP and frequency are locked after the first check-in.

## Future Extensions

Likely future additions:

- Voice assistant tools for goals, actions, and check-ins.
- Dashboard progression widget.
- Goal detail page.
- Per-goal check-in history.
- Richer analytics, adherence, and goal summaries.
- More frequency types, such as weekdays-only or custom schedules.
