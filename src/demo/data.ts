import type { JsonSchema, JsonValue } from "../index.js";
import { schema as editorSchema } from "./editor.js";
import { schema as exampleSchema } from "./example.js";

export interface DemoExample {
  schema: JsonSchema;
  value: JsonValue;
}

export type DemoFixtureName = "example" | "editor";

const DEMO_FIXTURES: Record<DemoFixtureName, JsonSchema> = {
  example: exampleSchema,
  editor: editorSchema,
};

export async function loadDemoFixture(fixture: DemoFixtureName = "editor"): Promise<DemoExample> {
  const payload = DEMO_FIXTURES[fixture] as unknown;
  assertSchema(payload);
  return { schema: payload, value: (payload.default ?? null) as JsonValue };
}

export function assertSchema(value: unknown): asserts value is JsonSchema {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Schema must be a JSON object.");
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load schema.";
}

