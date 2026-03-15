// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";

import {
  isCalendarMutationTool,
  isSuccessfulToolResult,
  isTaskMutationTool,
} from "./tool-effects";

describe("assistant tool effects", () => {
  it("detects successful tool results only when success is true", () => {
    expect(isSuccessfulToolResult({ success: true })).toBe(true);
    expect(isSuccessfulToolResult({ success: false })).toBe(false);
    expect(isSuccessfulToolResult({ ok: true })).toBe(false);
    expect(isSuccessfulToolResult(null)).toBe(false);
    expect(isSuccessfulToolResult("done")).toBe(false);
  });

  it("classifies calendar and task mutation tools", () => {
    expect(isCalendarMutationTool("createCalendarEvent")).toBe(true);
    expect(isCalendarMutationTool("getCalendarEvents")).toBe(false);
    expect(isTaskMutationTool("createTodo")).toBe(true);
    expect(isTaskMutationTool("getTodos")).toBe(false);
  });
});
