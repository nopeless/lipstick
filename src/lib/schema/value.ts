import type { JsonSchema202012, JsonValue } from '../types.js'
import { cloneJsonValue, isJsonObject } from '../value.js'
import { getArrayItemSchema, isArraySchema, isObjectSchema } from './resolution.js'
import { pickBestBranchIndex } from './unions.js'
import {
  acceptsType,
  getRequiredProperties,
  resolveSchema,
} from './resolution.js'
import { getJsonValueType, matchesType } from './internal.js'

export function buildInitialValue(
  schema: JsonSchema202012,
  root: JsonSchema202012,
): JsonValue {
  const resolved = resolveSchema(schema, root, undefined)

  if (resolved.default !== undefined) {
    return cloneJsonValue(resolved.default)
  }

  if (resolved.const !== undefined) {
    return resolved.const
  }

  if (resolved.enum?.length) {
    return resolved.enum[0]
  }

  if (resolved.oneOf?.length) {
    return buildInitialValue(resolved.oneOf[0], root)
  }

  if (resolved.anyOf?.length) {
    return buildInitialValue(resolved.anyOf[0], root)
  }

  if (isObjectSchema(resolved)) {
    const next: Record<string, JsonValue> = {}
    const required = getRequiredProperties(resolved, next)

    for (const [key, child] of Object.entries(resolved.properties ?? {})) {
      if (
        required.has(key) ||
        child.default !== undefined ||
        child.const !== undefined
      ) {
        next[key] = buildInitialValue(child, root)
      }
    }

    return next
  }

  if (isArraySchema(resolved)) {
    return []
  }

  if (acceptsType(resolved, 'boolean')) {
    return false
  }

  if (acceptsType(resolved, 'integer') || acceptsType(resolved, 'number')) {
    return 0
  }

  if (acceptsType(resolved, 'null')) {
    return null
  }

  return ''
}

export function sanitizeValueForSchema(
  value: JsonValue | undefined,
  schema: JsonSchema202012,
  root: JsonSchema202012,
): JsonValue {
  const resolved = resolveSchema(schema, root, value)

  if (resolved.const !== undefined) {
    return resolved.const
  }

  if (resolved.enum?.length) {
    return resolved.enum.includes(value as never)
      ? (value as never)
      : resolved.enum[0]
  }

  if (resolved.oneOf?.length) {
    const index = pickBestBranchIndex(resolved.oneOf, value, root)
    return sanitizeValueForSchema(value, resolved.oneOf[index], root)
  }

  if (resolved.anyOf?.length) {
    const index = pickBestBranchIndex(resolved.anyOf, value, root)
    return sanitizeValueForSchema(value, resolved.anyOf[index], root)
  }

  if (isObjectSchema(resolved)) {
    const source = isJsonObject(value) ? value : {}
    const next: Record<string, JsonValue> = {}
    const required = getRequiredProperties(resolved, source)

    for (const [key, child] of Object.entries(resolved.properties ?? {})) {
      if (key in source) {
        next[key] = sanitizeValueForSchema(source[key], child, root)
      } else if (
        required.has(key) ||
        child.default !== undefined ||
        child.const !== undefined
      ) {
        next[key] = buildInitialValue(child, root)
      }
    }

    for (const [key, childValue] of Object.entries(source)) {
      if (key in (resolved.properties ?? {})) {
        continue
      }

      if (resolved.additionalProperties === false) {
        continue
      }

      if (typeof resolved.additionalProperties === 'object' &&
          resolved.additionalProperties !== null) {
        next[key] = sanitizeValueForSchema(
          childValue,
          resolved.additionalProperties,
          root,
        )
        continue
      }

      next[key] = cloneJsonValue(childValue)
    }

    return next
  }

  if (isArraySchema(resolved)) {
    const source = Array.isArray(value) ? value : []
    const next = source.map((item, index) =>
      sanitizeValueForSchema(
        item,
        getArrayItemSchema(resolved, index) ?? {},
        root,
      ),
    )

    if (typeof resolved.maxItems === 'number') {
      next.length = Math.min(next.length, resolved.maxItems)
    }

    return next
  }

  if (resolved.type && !matchesType(value, resolved.type, getJsonValueType)) {
    return buildInitialValue(resolved, root)
  }

  return value === undefined ? buildInitialValue(resolved, root) : value
}
