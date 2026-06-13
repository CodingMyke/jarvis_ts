/**
 * OpenAI wrapper for Academy reel generation.
 * Server-only: API routes and worker usage.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { z } from "zod";

const OPENAI_MODEL = "gpt-4o";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return key.trim();
}

export async function generateReelGenerationObject<TSchema extends z.ZodTypeAny>(input: {
  prompt: string;
  schema: TSchema;
  targetFields: string[];
}) {
  getApiKey();

  const result = await generateObject({
    model: openai(OPENAI_MODEL),
    schema: input.schema,
    prompt: input.prompt,
  });

  return {
    object: result.object as unknown,
    rawText: JSON.stringify(result.object),
  };
}
