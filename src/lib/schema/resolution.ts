import type { JsonPointerPath, JsonSchema202012, JsonValue } from '../types.js'
import { isJsonObject } from '../value.js'
import {
  getJsonValueType,
  matchesType,
  mergeSchemas,
  resolveLocalRefs,
  isSchemaObject,
  REF_ERROR_KEY,
} from './internal.js'

export function getRefError(schema: JsonSchema202012): string | undefined {
  const candidate = schema[REF_ERROR_KEY]
  return typeof candidate === 'string' ? candidate : undefined
}

export { isSchemaObject } from './internal.js'

export function resolveSchema(
  schema: JsonSchema202012,
  root: JsonSchema202012,
  value: JsonValue | undefined,
): JsonSchema202012 {
  let resolved = resolveLocalRefs(schema, root, new Set(), resolveSchema)

  if (resolved.allOf?.length) {
    const base = omitSchemaKeys(resolved, ['allOf'])
    resolved = resolved.allOf.reduce(
      (merged, branch) =>
        mergeSchemas(merged, resolveSchema(branch, root, value)),
      base,
    )
  }

  if (resolved.if) {
    const branch = matchesSchema(value, resolved.if, root)
      ? resolved.then
      : resolved.else

    resolved = mergeSchemas(
      omitSchemaKeys(resolved, ['if', 'then', 'else']),
      branch ? resolveSchema(branch, root, value) : {},
    )
  }

  if (resolved.dependentSchemas && isJsonObject(value)) {
    let merged = resolved
    for (const [dependency, branch] of Object.entries(
      resolved.dependentSchemas,
    )) {
      if (dependency in value) {
        merged = mergeSchemas(merged, resolveSchema(branch, root, value))
      }
    }
    resolved = merged
  }

  return resolved
}

export function getRequiredProperties(
  schema: JsonSchema202012,
  value: JsonValue | undefined,
): Set<string> {
  const required = new Set(schema.required ?? [])

  if (!schema.dependentRequired || !isJsonObject(value)) {
    return required
  }

  for (const [dependency, fields] of Object.entries(schema.dependentRequired)) {
    if (dependency in value) {
      for (const field of fields) {
        required.add(field)
      }
    }
  }

  return required
}

export function matchesSchema(
  value: JsonValue | undefined,
  schema: JsonSchema202012,
  root: JsonSchema202012,
): boolean {
  const resolved = resolveLocalRefs(schema, root, new Set(), resolveSchema)

  if (resolved.const !== undefined) {
    return value === resolved.const
  }

  if (resolved.enum?.length) {
    return resolved.enum.includes(value as never)
  }

  if (resolved.allOf?.length) {
    return resolved.allOf.every((branch) => matchesSchema(value, branch, root))
  }

  if (resolved.oneOf?.length) {
    return (
      resolved.oneOf.filter((branch) => matchesSchema(value, branch, root))
        .length === 1
    )
  }

  if (resolved.anyOf?.length) {
    return resolved.anyOf.some((branch) => matchesSchema(value, branch, root))
  }

  if (resolved.type && !matchesType(value, resolved.type, getJsonValueType)) {
    return false
  }

  if (resolved.properties || resolved.required) {
    if (!isJsonObject(value)) {
      return false
    }

    for (const key of resolved.required ?? []) {
      if (!(key in value)) {
        return false
      }
    }

    for (const [key, child] of Object.entries(resolved.properties ?? {})) {
      if (key in value && !matchesSchema(value[key], child, root)) {
        return false
      }
    }
  }

  return true
}

export function getArrayItemSchema(
  schema: JsonSchema202012,
  index: number,
): JsonSchema202012 | undefined {
  if (schema.prefixItems?.[index]) {
    return schema.prefixItems[index]
  }

  if (schema.items === false) {
    return undefined
  }

  return isSchemaObject(schema.items) ? schema.items : {}
}

export function isObjectSchema(schema: JsonSchema202012): boolean {
  return (
    acceptsType(schema, 'object') ||
    !!schema.properties ||
    schema.additionalProperties !== undefined
  )
}

export function isArraySchema(schema: JsonSchema202012): boolean {
  return (
    acceptsType(schema, 'array') ||
    !!schema.prefixItems ||
    schema.items !== undefined
  )
}

export function acceptsType(
  schema: JsonSchema202012,
  expected: string,
): boolean {
  if (!schema.type) {
    return false
  }

  return Array.isArray(schema.type)
    ? schema.type.includes(expected)
    : schema.type === expected
}

export function humanizeLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase())
}

export function pathToKey(path: JsonPointerPath): string {
  if (path.length === 0) {
    return '#'
  }

  return (
    '#/' +
    path
      .map((segment) => String(segment).replaceAll('~', '~0').replaceAll('/', '~1'))
      .join('/')
  )
}

function omitSchemaKeys(
  schema: JsonSchema202012,
  keys: string[],
): JsonSchema202012 {
  const next = { ...schema }
  keys.forEach((key) => {
    delete next[key]
  })
  return next
}
