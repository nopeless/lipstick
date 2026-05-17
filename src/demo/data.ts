import type { JsonSchema202012, JsonValue } from '../index.js'
import {
  DRAFT_2020_12_SCHEMA_URI,
  getSchemaDialectError,
} from '../lib/validation.js'

export interface DemoExample {
  schema: JsonSchema202012
  value: JsonValue
}

export type DemoFixtureName = 'example' | 'editor'

const DEMO_FIXTURES: Record<DemoFixtureName, string> = {
  example: './example.json',
  editor: './editor.json',
}

export async function loadDemoFixture(
  fixture: DemoFixtureName = 'editor',
): Promise<DemoExample> {
  const response = await fetch(new URL(DEMO_FIXTURES[fixture], import.meta.url))

  if (!response.ok) {
    throw new Error(`Failed to load ${fixture} demo with ${response.status}.`)
  }

  const payload = (await response.json()) as unknown
  assertDemoExample(payload)
  return payload
}

export function assertSchema(value: unknown): asserts value is JsonSchema202012 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Schema must be a JSON object.')
  }

  const dialectError = getSchemaDialectError(value as JsonSchema202012)
  if (dialectError) {
    throw new Error(
      `${dialectError} Use "$schema": "${DRAFT_2020_12_SCHEMA_URI}".`,
    )
  }
}

export function assertDemoExample(value: unknown): asserts value is DemoExample {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Demo fixture must be a JSON object.')
  }

  const payload = value as Record<string, unknown>
  assertSchema(payload.schema)

  if (!('value' in payload)) {
    throw new Error('Demo fixture is missing an initial value.')
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load schema.'
}
