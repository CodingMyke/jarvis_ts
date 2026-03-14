---
name: code-style
description: TypeScript code style and formatting standards using ESLint. Use when writing or reviewing TypeScript/React code.
---

# TypeScript/React Code Style

## Formatting
- Use ESLint for linting (`npm run lint`)
- Indentation: 2 spaces
- Max line length: 100-120 characters
- Use trailing commas in multi-line objects/arrays
- Use semicolons consistently

## Naming Conventions
- Functions and variables: `camelCase`
- React Components: `PascalCase`
- Types and Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `camelCase.ts` or `PascalCase.tsx` for components
- Private members: prefix with `_` or use TypeScript `private` keyword

## TypeScript Types
- Required for all function parameters and return types
- Use `Type | null` or `Type | undefined` for nullable types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use strict TypeScript settings
- Avoid `any` - use `unknown` when type is truly unknown

Example:
```typescript
interface Item {
  id: string;
  price: number;
}

/**
 * Calculate the total price of items with optional discount.
 */
function calculateTotal(items: Item[], discount: number = 0.0): number {
  if (discount < 0 || discount > 1) {
    throw new Error('Discount must be between 0 and 1');
  }
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 - discount);
}
```

## React Components
- Use functional components with hooks
- Use Atomic Design principles (atoms/molecules/organisms/templates/pages)
- Keep all React components under `app/design`; keep `app/_features` for hooks, stores, domain logic, adapters, types, and helpers
- Organize `app/design` primarily by Atomic Design level, then by domain when useful (for example `app/design/atoms/shared`, `app/design/organisms/calendar`)
- Keep App Router files (`page.tsx`, `layout.tsx`, `route.ts`) thin and outside `app/design` only when required by Next.js routing conventions
- Separate logic with custom hooks and keep them in separate files, colocated with the component subtree or feature logic when appropriate
- Model domains with equivalent UX and lifecycle in a symmetrical way
- Keep component small and focused
- Do not create multiple important components in the same file; each exported component should live in its own file
- Do not define non-trivial custom hooks in the same file as an exported component
- Keep pages and components clear.

## React Architecture
- `app/design` is the source of truth for React UI composition
- `app/_features/*` owns business logic, domain state, side effects, API interaction, normalization, and reusable hooks
- Prefer container/template components that compose smaller atoms, molecules, and organisms instead of large monoliths
- Avoid feature UI files that mix:
  - domain mapping
  - network calls
  - state orchestration
  - large JSX trees
- Split large UI files by responsibility first, not just by line count
- A component tree should expose the minimum public props needed by its parent; internal concerns should stay internal to the subtree

## File and Folder Conventions
- Prefer one exported component per file
- Prefer one custom hook per file
- Use `PascalCase.tsx` for React components
- Use `camelCase.ts` for hooks, stores, utilities, schemas, and adapters
- Keep barrel exports lean and intentional; do not hide poor structure behind broad re-exports
- Co-locate small subtree-only components and hooks near the owning organism/template
- Shared visual primitives belong in `app/design/atoms/shared` or `app/design/molecules/shared`, not inside feature logic folders

## Imports
- Use path aliases (`@/` for src/)
- Group: React/Next, third-party, local, types
- Order: external libraries, components, hooks, utils, types
- Avoid default exports except for pages/routes

Example:
```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/database.types';
```

## Zod Schemas
- Define schemas for all data validation
- Co-locate with types
- Use for form validation and API validation

```typescript
import { z } from 'zod';

export const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
  tags: z.array(z.string()).optional(),
});

export type ResourceFormData = z.infer<typeof resourceSchema>;
```

## Commands
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Format: Configure in ESLint or use Prettier
