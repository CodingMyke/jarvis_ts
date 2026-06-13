# Shared UI Tokens

Use semantic tokens before raw visual values.

- Add a token when a visual rule defines product language or repeats across features.
- Keep raw utilities only for local layout glue that would not improve a shared API.
- Default shape is square. Use `radius-circle` only for explicit circular affordances.
- Shared primitives in `app/_shared/ui` must consume these tokens instead of ad hoc values.
