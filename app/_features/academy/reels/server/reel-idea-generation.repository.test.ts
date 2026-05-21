import { describe, expect, it, vi } from "vitest";
import { hasActiveFlowRun } from "./reel-idea-generation.repository";

function createSupabaseMock(options?: { rows?: Array<{ id: string }> }) {
  const rows = options?.rows ?? [];

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  };

  const supabase = {
    from: vi.fn(() => chain),
  } as never;

  return { supabase, chain };
}

describe("reel idea generation repository", () => {
  it("treats multiple active rows as an active run instead of throwing", async () => {
    const { supabase, chain } = createSupabaseMock({
      rows: [{ id: "run-1" }, { id: "run-2" }],
    });

    await expect(
      hasActiveFlowRun(supabase, {
        userId: "user-1",
        flow: "reel_idea_generation",
      }),
    ).resolves.toBe(true);

    expect(chain.limit).toHaveBeenCalledWith(1);
  });
});
