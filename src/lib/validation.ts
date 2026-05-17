import Schema from 'typebox/schema'
import type { TLocalizedValidationError } from 'typebox/error'
import type { JsonSchema202012, JsonValue } from './types.js'

export const DRAFT_2020_12_SCHEMA_URI =
  'https://json-schema.org/draft/2020-12/schema'

const DRAFT_2020_12_DIALECTS = new Set([
  DRAFT_2020_12_SCHEMA_URI,
  `${DRAFT_2020_12_SCHEMA_URI}#`,
  DRAFT_2020_12_SCHEMA_URI.replace('https://', 'http://'),
  `${DRAFT_2020_12_SCHEMA_URI.replace('https://', 'http://')}#`,
])

const validatorCache = new WeakMap<
  JsonSchema202012,
  ReturnType<typeof Schema.Compile>
>()
const validatorErrorCache = new WeakMap<JsonSchema202012, string>()

export interface ValidationIssue {
  keyword: string
  instancePath: string
  message: string
}

export interface ValidationSnapshot {
  valid: boolean
  issues: ValidationIssue[]
  fieldMessages: Map<string, string[]>
  schemaError?: string
}

export function getSchemaDialectError(
  schema: JsonSchema202012,
): string | undefined {
  if (!schema.$schema) {
    return undefined
  }

  if (DRAFT_2020_12_DIALECTS.has(schema.$schema)) {
    return undefined
  }

  return `Only JSON Schema Draft 2020-12 is supported. Received "${schema.$schema}".`
}

export function validateValueAgainstSchema(
  schema: JsonSchema202012,
  value: JsonValue | undefined,
): ValidationSnapshot {
  const dialectError = getSchemaDialectError(schema)

  if (dialectError) {
    return {
      valid: false,
      issues: [],
      fieldMessages: new Map(),
      schemaError: dialectError,
    }
  }

  const validator = getValidator(schema)

  if (!validator) {
    return {
      valid: false,
      issues: [],
      fieldMessages: new Map(),
      schemaError:
        validatorErrorCache.get(schema) ??
        'Unable to compile JSON Schema for validation.',
    }
  }

  const [valid, errors] = validator.Errors(value)
  const issues = toIssues(errors)
  return {
    valid,
    issues,
    fieldMessages: toFieldMessages(issues),
  }
}

export function getFieldMessagesForSchema(
  schema: JsonSchema202012,
  value: JsonValue | undefined,
): Map<string, string[]> {
  const validator = getValidator(schema)
  if (!validator) {
    return new Map()
  }

  const [, errors] = validator.Errors(value)
  return toFieldMessages(toIssues(errors))
}

function getValidator(
  schema: JsonSchema202012,
): ReturnType<typeof Schema.Compile> | undefined {
  const cached = validatorCache.get(schema)
  if (cached) {
    return cached
  }

  try {
    const validator = Schema.Compile(schema)
    validatorCache.set(schema, validator)
    validatorErrorCache.delete(schema)
    return validator
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    validatorErrorCache.set(schema, message)
    return undefined
  }
}

function toIssues(errors: TLocalizedValidationError[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const error of errors) {
    const pointers = expandErrorPointers(error)

    for (const pointer of pointers) {
      issues.push({
        keyword: error.keyword,
        instancePath: pointer,
        message: error.message,
      })
    }
  }

  return issues
}

function toFieldMessages(issues: ValidationIssue[]): Map<string, string[]> {
  const fieldMessages = new Map<string, string[]>()

  for (const issue of issues) {
    const key = pointerToPathKey(issue.instancePath)
    const list = fieldMessages.get(key) ?? []

    if (!list.includes(issue.message)) {
      fieldMessages.set(key, [...list, issue.message])
    }
  }

  return fieldMessages
}

function expandErrorPointers(error: TLocalizedValidationError): string[] {
  if (error.keyword === 'required') {
    const requiredProperties = readStringList(
      (error.params as { requiredProperties?: unknown }).requiredProperties,
    )

    if (requiredProperties.length > 0) {
      return requiredProperties.map((property) =>
        appendPointer(error.instancePath, property),
      )
    }
  }

  if (
    error.keyword === 'dependentRequired' ||
    error.keyword === 'dependencies'
  ) {
    const dependencies = readStringList(
      (error.params as { dependencies?: unknown }).dependencies,
    )

    if (dependencies.length > 0) {
      return dependencies.map((property) =>
        appendPointer(error.instancePath, property),
      )
    }
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperties = readStringList(
      (error.params as { additionalProperties?: unknown }).additionalProperties,
    )

    if (additionalProperties.length > 0) {
      return additionalProperties.map((property) =>
        appendPointer(error.instancePath, property),
      )
    }
  }

  return [error.instancePath]
}

function readStringList(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return []
  }

  return candidate.filter((value): value is string => typeof value === 'string')
}

function appendPointer(basePointer: string, segment: string): string {
  const safeSegment = segment.replaceAll('~', '~0').replaceAll('/', '~1')
  if (!basePointer) {
    return `/${safeSegment}`
  }
  return `${basePointer}/${safeSegment}`
}

function pointerToPathKey(pointer: string): string {
  return pointer ? `#${pointer}` : '#'
}
