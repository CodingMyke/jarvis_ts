---
name: testing
description: Testing conventions using Vitest and React Testing Library. Use when writing tests, creating fixtures, or running test suites.
---

# Testing Standards

## Frameworks
- **Unit/Integration**: Vitest
- **React Components**: React Testing Library
- **E2E** (if needed): Playwright
- Target 80%+ code coverage

## File Organization
- Tests co-located with source files or in `__tests__/` directories
- Test files: `<module>.test.ts` or `<module>.test.tsx`
- Test utilities in `tests/utils/` or `__tests__/utils/`

Example structure:
```
src/
  components/
    Button.tsx
    Button.test.tsx
  hooks/
    useAuth.ts
    useAuth.test.ts
  lib/
    utils.ts
    __tests__/
      utils.test.ts
```

## Test Utilities
- Create factory functions for test data
- Create mock builders for complex objects
- Share utilities in `tests/utils/`

Example:
```typescript
// tests/utils/factories.ts
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}
```

## Parametrization
- Use `describe.each` or `it.each` for testing multiple inputs

Example:
```typescript
describe.each([
  [1, 2],
  [2, 4],
  [0, 0],
])('double(%i)', (input, expected) => {
  it(`should return ${expected}`, () => {
    expect(double(input)).toBe(expected);
  });
});
```

## Assertions
- Use Vitest matchers (`expect`, `toBe`, `toEqual`, etc.)
- Write clear test descriptions
- Test one concept per test function
- Use `toMatchObject` for partial matching

## Mocking
- Use Vitest `vi.mock()` for modules
- Use `vi.fn()` for function mocks
- Mock external dependencies (Supabase, APIs, AI SDK)
- Use MSW (Mock Service Worker) for API mocking if needed

Example:
```typescript
import { vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));
```

## React Component Testing
- Use React Testing Library
- Test user behavior, not implementation
- Use `screen.getByRole` over `getByTestId`
- Test accessibility

Example:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Async Testing
```typescript
import { waitFor } from '@testing-library/react';

it('should load user data', async () => {
  render(<UserProfile userId="123" />);
  
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## Commands
- Run tests: `npm test` or `vitest`
- Watch mode: `vitest --watch`
- Coverage: `vitest --coverage`
- UI mode: `vitest --ui`
- Single file: `vitest src/lib/utils.test.ts`

# Important
- start all the tests files with this comment:
// used the fkg testing skill zioo
