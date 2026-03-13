export type ToolSchemaPrimitiveType = "string" | "number" | "boolean";

interface ToolSchemaBase {
  description?: string;
}

export interface ToolStringProperty extends ToolSchemaBase {
  type: "string";
  enum?: string[];
}

export interface ToolNumberProperty extends ToolSchemaBase {
  type: "number";
}

export interface ToolBooleanProperty extends ToolSchemaBase {
  type: "boolean";
}

export interface ToolArrayProperty extends ToolSchemaBase {
  type: "array";
  items: ToolSchemaProperty;
}

export interface ToolObjectProperty extends ToolSchemaBase {
  type: "object";
  properties: Record<string, ToolSchemaProperty>;
  required?: string[];
}

export type ToolSchemaProperty =
  | ToolStringProperty
  | ToolNumberProperty
  | ToolBooleanProperty
  | ToolArrayProperty
  | ToolObjectProperty;

export interface ToolParametersSchema {
  type: "object";
  properties: Record<string, ToolSchemaProperty>;
  required?: string[];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

export function isToolSchemaProperty(value: unknown): value is ToolSchemaProperty {
  const record = toRecord(value);
  if (!record || typeof record.type !== "string") {
    return false;
  }

  if (record.description !== undefined && typeof record.description !== "string") {
    return false;
  }

  switch (record.type) {
    case "string":
      return record.enum === undefined || (
        Array.isArray(record.enum)
        && record.enum.every((entry: unknown) => typeof entry === "string")
      );
    case "number":
    case "boolean":
      return true;
    case "array":
      return isToolSchemaProperty(record.items);
    case "object":
      return (
        typeof record.properties === "object"
        && record.properties !== null
        && Object.values(record.properties).every((entry) => isToolSchemaProperty(entry))
        && (
          record.required === undefined
          || (
            Array.isArray(record.required)
            && record.required.every((entry: unknown) => typeof entry === "string")
          )
        )
      );
    default:
      return false;
  }
}

export function isToolParametersSchema(value: unknown): value is ToolParametersSchema {
  const record = toRecord(value);
  if (!record || record.type !== "object" || typeof record.properties !== "object" || record.properties === null) {
    return false;
  }

  if (
    record.required !== undefined
    && (!Array.isArray(record.required) || !record.required.every((entry: unknown) => typeof entry === "string"))
  ) {
    return false;
  }

  return Object.values(record.properties).every((entry) => isToolSchemaProperty(entry));
}
