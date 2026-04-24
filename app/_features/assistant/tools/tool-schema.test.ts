// used the fkg testing skill zioo
import { describe, expect, it } from "vitest";
import { createCalendarEventTool } from "@/app/_features/assistant/tools/definitions/create-calendar-event.tool";
import { createTodoTool } from "@/app/_features/assistant/tools/definitions/create-todo.tool";
import {
  isToolParametersSchema,
  isToolSchemaProperty,
} from "./tool-schema";

describe("tool schema", () => {
  it("supports array items in tool parameters", () => {
    expect(isToolParametersSchema(createTodoTool.parameters)).toBe(true);
    expect(isToolParametersSchema(createCalendarEventTool.parameters)).toBe(true);
  });

  it("supports nested object and enum properties", () => {
    expect(
      isToolSchemaProperty({
        type: "object",
        description: "nested object",
        required: ["mode"],
        properties: {
          mode: {
            type: "string",
            description: "mode",
            enum: ["auto", "manual"],
          },
          attendees: {
            type: "array",
            description: "attendees",
            items: {
              type: "object",
              description: "attendee",
              properties: {
                email: {
                  type: "string",
                  description: "email",
                },
              },
            },
          },
        },
      }),
    ).toBe(true);
  });

  it("rejects malformed schema definitions", () => {
    expect(
      isToolSchemaProperty({
        type: "array",
        description: "broken",
      }),
    ).toBe(false);
  });
});
