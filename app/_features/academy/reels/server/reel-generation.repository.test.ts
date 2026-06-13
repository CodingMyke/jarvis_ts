import { describe, expect, it, vi } from "vitest";
import {
  insertManualGenerationJob,
  insertRunLog,
  listPendingJobs,
} from "./reel-generation.repository";

function createSupabaseMock() {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const chain = {
    select: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "select", args });
      return chain;
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "eq", args });
      return chain;
    }),
    lte: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "lte", args });
      return chain;
    }),
    order: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "order", args });
      return chain;
    }),
    limit: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "limit", args });
      return Promise.resolve({ data: [], error: null });
    }),
    insert: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "insert", args });
      return chain;
    }),
    upsert: vi.fn((...args: unknown[]) => {
      calls.push({ table: currentTable, method: "upsert", args });
      return chain;
    }),
    single: vi.fn(() => Promise.resolve({ data: { id: "job-1" }, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  let currentTable = "";

  const supabase = {
    from: vi.fn((table: string) => {
      currentTable = table;
      return chain;
    }),
  } as never;

  return { supabase, calls };
}

describe("reel generation repository", () => {
  it("queries pending jobs by queue status and time", async () => {
    const { supabase, calls } = createSupabaseMock();

    await listPendingJobs(supabase, { now: "2026-05-13T10:00:00.000Z", limit: 10 });

    expect(calls[0]).toMatchObject({ table: "academy_reel_generation_queue_jobs", method: "select" });
    expect(calls.some((c) => c.method === "eq" && c.args[0] === "user_id")).toBe(false);
    expect(calls.some((c) => c.method === "eq" && c.args[0] === "status" && c.args[1] === "queued")).toBe(true);
    expect(calls.some((c) => c.method === "lte" && c.args[0] === "run_at")).toBe(true);
    expect(calls.some((c) => c.method === "order" && c.args[0] === "run_at")).toBe(true);
  });

  it("inserts manual jobs and run logs with owner scoping", async () => {
    const { supabase, calls } = createSupabaseMock();

    await insertManualGenerationJob(supabase, "user-1", { reelId: "reel-1", runAt: "2026-05-13T10:00:00.000Z" });
    await insertRunLog(supabase, "user-1", { status: "started", reelId: "reel-1", jobId: "job-1", metadata: {} });

    expect(calls.some((c) => c.table === "academy_reel_generation_queue_jobs" && c.method === "insert")).toBe(true);
    expect(calls.some((c) => c.table === "academy_reel_generation_run_logs" && c.method === "insert")).toBe(true);
  });
});
