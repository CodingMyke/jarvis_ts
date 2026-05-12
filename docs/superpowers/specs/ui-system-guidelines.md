# UI System Guidelines

## Purpose

This document defines the foundation rules for the UI system refactor.
The goal is to normalize shared UI around semantic tokens, remove decorative
wrappers, and keep `app/_shared/ui` as the single reusable UI boundary.

## Token Taxonomy

All reusable UI styling must map to semantic tokens first.
The baseline token groups are:

- `color`: app background, text, accent, warning, danger, success
- `surface`: app, panel, overlay, raised tool surface, interactive fill
- `border`: subtle, strong, accent, danger, warning, focus ring
- `space`: inline, stack, section, panel, inset, layout gap
- `text`: body, caption, section label, title, emphasis
- `shadow`: overlay, focus, active affordance, exceptional glow only
- `motion`: fast, base, slow, easing, enter, exit
- `z-index`: base, sticky, overlay, modal, transient tool layers

## Token Rules

- Tokens are semantic-first, not palette-first.
- Shared components must consume tokens, never hard-coded visual values.
- Tailwind classes should reference token-backed utilities whenever the style
  can recur across more than one component.
- Raw utilities are acceptable only for truly local, one-off layout concerns
  that do not define reusable visual language.
- Raw arbitrary values are the last escape hatch and must stay local to a
  single component.

## Shape Policy

- Default radius is none for shell surfaces, panels, cards, drawers, dialogs,
  buttons, and navigation items.
- The absence of rounding is the global default and does not need per-component
  justification.
- Rounded utilities on shared UI require an explicit exception reason.

## Circular Affordance Exceptions

Rounded or circular treatments are allowed only for affordances whose meaning
depends on circular geometry:

- voice orb or recording orb
- status dots, presence indicators, notification pips
- avatar containers
- explicitly circular icon-only controls

These exceptions must use dedicated semantic tokens such as `radius-circle`,
not ad hoc `rounded-*` styling spread across components.

## Wrapper Rules

- Keep a wrapper only if it provides visible grouping the user can read.
- Keep behavioral wrappers when they are required for accessibility, state,
  scrolling, positioning, or event boundaries.
- Remove decorative shells that only add nested borders, radius, blur, or fill
  without clarifying structure.
- Grouping must stay legible through spacing, alignment, typography, and sparse
  separators before adding new containers.
- If a section still needs a panel, the panel must represent a real unit of
  content, tools, or state.

## Token-First vs Raw Utility Rule

Use token-first styling when:

- the style expresses product language
- the style appears in more than one feature
- the style defines interaction states
- the style belongs to `app/_shared/ui`

Use raw utilities only when:

- the value is local layout glue
- reuse would make the API noisier instead of clearer
- the style is temporary until a proven token emerges

If a raw utility repeats, promote it into the token system or shared primitive.

## `app/_shared/ui` Import Boundaries

- Reusable primitives, shared compounds, and shared UI tokens live in
  `app/_shared/ui`.
- `app/design` may compose shared UI and feature assemblies, but it must not
  become a second primitive system.
- Feature code may import from `app/_shared/ui` and from its own local feature
  modules.
- `app/_shared/ui` must not import from `app/design`.
- `app/_shared/ui` must not import feature-specific modules from `app/_features`.
- App Router entrypoints stay thin and import through `app/_features`,
  `app/_shared`, and `app/_server`.

## Review Checklist

- Is this visual rule already covered by a semantic token?
- Does this wrapper communicate grouping to the user?
- Is rounding being introduced without a circular-affordance reason?
- Should this code live in `app/_shared/ui` instead of `app/design`?
