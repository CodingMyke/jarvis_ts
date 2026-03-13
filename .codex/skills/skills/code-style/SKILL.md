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
- Separate logic with custom hooks
- Follow composition over props drilling
- Use Atomic Design principles (atoms/molecules/organisms/templates/pages)
- Minimize `useState` and `useEffect` - prefer derived state and custom hooks

Example:
```typescript
// Custom hook in same file
function useResourceForm(initialData?: Resource) {
  const form = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: initialData,
  });
  
  return { form, isValid: form.formState.isValid };
}

// Component with clean JSX
export function ResourceForm({ onSubmit }: ResourceFormProps) {
  const { form, isValid } = useResourceForm();
  
  return (
    <Form {...form}>
      {/* JSX */}
    </Form>
  );
}
```

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
