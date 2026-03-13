// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import {
  taskCreateBodySchema,
  taskDeleteBodySchema,
  taskUpdateBodySchema,
} from "./tasks-route.schemas";

describe("tasks route schemas", () => {
  it("accepts single create payloads", () => {
    expect(taskCreateBodySchema.safeParse({ text: "Comprare il latte" }).success).toBe(true);
  });

  it("accepts batch updates with typed entries", () => {
    expect(
      taskUpdateBodySchema.safeParse({
        updates: [{ id: "task-1", completed: true }],
      }).success,
    ).toBe(true);
  });

  it("rejects delete payloads with multiple actions", () => {
    expect(
      taskDeleteBodySchema.safeParse({
        id: "task-1",
        deleteAll: true,
      }).success,
    ).toBe(false);
  });
});
