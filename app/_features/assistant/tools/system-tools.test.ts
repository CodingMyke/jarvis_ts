// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import {
  BACKGROUND_MEMORY_WRITE_TOOL_NAMES,
  MEMORY_SEARCH_TOOL_NAMES,
  SYSTEM_TOOL_DECLARATIONS,
  SYSTEM_TOOLS,
} from "./system-tools";

describe("system tools", () => {
  it("exports the complete system tool list and declarations", () => {
    expect(SYSTEM_TOOLS.length).toBeGreaterThan(20);
    expect(SYSTEM_TOOL_DECLARATIONS).toHaveLength(SYSTEM_TOOLS.length);
    expect(SYSTEM_TOOL_DECLARATIONS.every((tool) => !("execute" in tool))).toBe(true);
  });

  it("tracks background memory writes and search tools separately", () => {
    expect(BACKGROUND_MEMORY_WRITE_TOOL_NAMES.has("createEpisodicMemory")).toBe(true);
    expect(BACKGROUND_MEMORY_WRITE_TOOL_NAMES.has("updateSemanticMemory")).toBe(true);
    expect(MEMORY_SEARCH_TOOL_NAMES.has("searchEpisodicMemories")).toBe(true);
    expect(MEMORY_SEARCH_TOOL_NAMES.has("searchSemanticMemories")).toBe(true);
  });
});
