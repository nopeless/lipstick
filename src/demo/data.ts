import type { JsonSchema202012, JsonValue } from '../index.js'

export interface DemoExample {
  schema: JsonSchema202012
  value: JsonValue
}

export async function loadDemoExample(): Promise<DemoExample> {
  const response = await fetch(new URL('./example.json', import.meta.url))

  if (!response.ok) {
    throw new Error(`Failed to load demo example with ${response.status}.`)
  }

  const payload = (await response.json()) as unknown
  assertDemoExample(payload)
  return payload
}

export function assertSchema(value: unknown): asserts value is JsonSchema202012 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Schema must be a JSON object.')
  }
}

export function assertDemoExample(value: unknown): asserts value is DemoExample {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Demo example must be a JSON object.')
  }

  const payload = value as Record<string, unknown>
  assertSchema(payload.schema)

  if (!('value' in payload)) {
    throw new Error('Demo example is missing an initial value.')
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load schema.'
}
