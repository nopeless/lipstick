import type { TSchema, JsonValue } from "../index.js";

export interface DemoExample {
  schema: TSchema;
  value: JsonValue;
}

export type DemoFixtureName = "example" | "editor";

const DEMO_FIXTURES: Record<DemoFixtureName, string> = {
  example: "./example.json",
  editor: "./editor.json",
};

export async function loadDemoFixture(fixture: DemoFixtureName = "editor"): Promise<DemoExample> {
  const response = await fetch(new URL(DEMO_FIXTURES[fixture], import.meta.url));

  if (!response.ok) {
    throw new Error(`Failed to load ${fixture} demo with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  assertDemoExample(payload);
  return payload;
}

export function assertSchema(value: unknown): asserts value is TSchema {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Schema must be a JSON object.");
  }
}

export function assertDemoExample(value: unknown): asserts value is DemoExample {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Demo fixture must be a JSON object.");
  }

  const payload = value as Record<string, unknown>;
  assertSchema(payload.schema);

  if (!("value" in payload)) {
    throw new Error("Demo fixture is missing an initial value.");
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load schema.";
}

