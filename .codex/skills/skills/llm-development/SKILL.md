---
name: llm-development
description: LLM and AI development best practices with AI SDK and OpenAI. Use when building AI/ML applications.
---

# LLM & AI Development

## Frameworks
- **LLM**: Vercel AI SDK (@ai-sdk/openai)
- **API**: Next.js API Routes (Route Handlers)
- **Validation**: Zod schemas
- **Background Jobs**: Inngest

## Configuration Management
- Use environment variables for API keys and configs
- Store in `.env.local` (never commit `.env` files)
- Separate dev/staging/prod configurations
- Use Next.js environment variables conventions

Example:
```typescript
// .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## AI SDK Best Practices
- Use `generateText` for one-shot completions
- Use `streamText` for streaming responses
- Implement proper error handling for LLM calls
- Add retry logic for API failures
- Cache expensive operations

Example with AI SDK:
```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: 'Summarize: ' + content,
  maxTokens: 500,
});
```

## Streaming Responses
```typescript
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4-turbo'),
    prompt,
  });
  
  return result.toDataStreamResponse();
}
```

## Background Jobs with Inngest
- Use Inngest for async AI operations
- Process long-running tasks in background
- Handle retries automatically

```typescript
import { inngest } from '@/inngest/client';

export const processResource = inngest.createFunction(
  { id: 'process-resource' },
  { event: 'resource.created' },
  async ({ event, step }) => {
    const embedding = await step.run('generate-embedding', async () => {
      return await generateEmbedding(event.data.content);
    });
    
    await step.run('save-embedding', async () => {
      return await saveEmbedding(event.data.id, embedding);
    });
  }
);
```

## Prompt Engineering
- Store prompts in separate files (`src/features/server/ai/prompts.ts`)
- Version control prompt templates
- Use template literals for dynamic prompts
- Test prompts with diverse inputs
- Document expected outputs

```typescript
// prompts.ts
export const SUMMARIZE_PROMPT = (content: string) => `
Summarize the following content in 2-3 sentences:

${content}
`;
```

## Error Handling
- Catch and log LLM API errors
- Implement graceful degradation
- Set appropriate timeouts
- Handle rate limiting
- Use try-catch with proper error types

```typescript
try {
  const result = await generateText({
    model: openai('gpt-4-turbo'),
    prompt,
    maxRetries: 3,
  });
  return result.text;
} catch (error) {
  if (error instanceof Error) {
    console.error('AI generation failed:', error.message);
  }
  return fallbackContent;
}
```

## Performance
- Use async/await for I/O-bound LLM calls
- Implement caching with React Query or server-side
- Process in background with Inngest for long operations
- Monitor token usage and costs
- Use streaming for better UX

## Embeddings
- Use for semantic search
- Store in Supabase with pgvector
- Chunk content appropriately

```typescript
import { embed } from 'ai';

const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: content,
});
```

## Testing AI Features
- Mock AI SDK responses for unit tests
- Use test API keys for integration tests
- Test edge cases and failure modes
- Validate output format with Zod
- Test rate limiting and retries
