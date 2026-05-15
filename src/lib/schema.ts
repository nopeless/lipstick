import type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonValue,
} from './types.js'
import { cloneJsonValue, isJsonObject } from './value.js'

export interface DiscriminatorInfo {
  property: string
  options: Array<{
    index: number
    label: string
    value: JsonPrimitive
  }>
}

export interface UnionPresentation {
  kind: 'boolean' | 'enum' | 'discriminator' | 'generic'
  selectedIndex: number
  options: Array<{
    index: number
    label: string
    literal?: JsonPrimitive
  }>
  discriminator?: DiscriminatorInfo
}

const REF_ERROR_KEY = 'x-lipstick-ref-error'

export function getRefError(schema: JsonSchema202012): string | undefined {
  const candidate = schema[REF_ERROR_KEY]
  return typeof candidate === 'string' ? candidate : undefined
}

export function isSchemaObject(
  candidate: unknown,
): candidate is JsonSchema202012 {
  return typeof candidate === 'object' && candidate !== null
}

export function resolveSchema(
  schema: JsonSchema202012,
  root: JsonSchema202012,
  value: JsonValue | undefined,
): JsonSchema202012 {
  let resolved = resolveLocalRefs(schema, root, new Set())

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
  const resolved = resolveLocalRefs(schema, root, new Set())

  if (resolved.const !== undefined) {
    return value === resolved.const
  }

  if (resolved.enum?.length) {
    return resolved.enum.includes(value as JsonPrimitive)
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

  if (resolved.type && !matchesType(value, resolved.type)) {
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
    return resolved.enum.includes(value as JsonPrimitive)
      ? (value as JsonPrimitive)
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

      if (isSchemaObject(resolved.additionalProperties)) {
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

  if (resolved.type && !matchesType(value, resolved.type)) {
    return buildInitialValue(resolved, root)
  }

  return value === undefined ? buildInitialValue(resolved, root) : value
}

export function describeUnion(
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  root: JsonSchema202012,
  preferredIndex?: number,
): UnionPresentation | undefined {
  const branches = schema.oneOf ?? schema.anyOf

  if (!branches?.length) {
    return undefined
  }

  const selectedIndex =
    preferredIndex ?? pickBestBranchIndex(branches, value, root)
  const literalOptions = branches.map((branch, index) => ({
    index,
    label: getBranchLabel(branch, index),
    literal: getLiteralBranchValue(branch, root),
  }))

  const discriminator = inferDiscriminator(branches, root)

  if (
    literalOptions.length === 2 &&
    literalOptions.every((option) => typeof option.literal === 'boolean')
  ) {
    return { kind: 'boolean', selectedIndex, options: literalOptions }
  }

  if (
    literalOptions.length > 0 &&
    literalOptions.length <= 5 &&
    literalOptions.every((option) => option.literal !== undefined)
  ) {
    return { kind: 'enum', selectedIndex, options: literalOptions }
  }

  if (discriminator) {
    return {
      kind: 'discriminator',
      selectedIndex,
      options: literalOptions,
      discriminator,
    }
  }

  return { kind: 'generic', selectedIndex, options: literalOptions }
}

export function pickBestBranchIndex(
  branches: JsonSchema202012[],
  value: JsonValue | undefined,
  root: JsonSchema202012,
): number {
  const discriminator = inferDiscriminator(branches, root)

  if (discriminator && isJsonObject(value)) {
    const currentValue = value[discriminator.property]
    const match = discriminator.options.find(
      (option) => option.value === currentValue,
    )

    if (match) {
      return match.index
    }
  }

  for (let index = 0; index < branches.length; index += 1) {
    if (matchesSchema(value, branches[index], root)) {
      return index
    }
  }

  return 0
}

export function inferDiscriminator(
  branches: JsonSchema202012[],
  root: JsonSchema202012,
): DiscriminatorInfo | undefined {
  const candidateProperties = new Map<string, Array<{ index: number; value: JsonPrimitive }>>()

  branches.forEach((branch, index) => {
    const resolved = resolveSchema(branch, root, undefined)
    if (!isObjectSchema(resolved)) {
      return
    }

    const required = new Set(resolved.required ?? [])
    for (const [property, schemaCandidate] of Object.entries(
      resolved.properties ?? {},
    )) {
      if (!required.has(property)) {
        continue
      }

      const literal = getLiteralBranchValue(schemaCandidate, root)
      if (literal === undefined) {
        continue
      }

      const list = candidateProperties.get(property) ?? []
      list.push({ index, value: literal })
      candidateProperties.set(property, list)
    }
  })

  for (const [property, entries] of candidateProperties) {
    if (entries.length !== branches.length) {
      continue
    }

    const uniqueValues = new Set(entries.map((entry) => entry.value))
    if (uniqueValues.size !== branches.length) {
      continue
    }

    return {
      property,
      options: entries.map((entry) => ({
        index: entry.index,
        value: entry.value,
        label: getBranchLabel(branches[entry.index], entry.index),
      })),
    }
  }

  return undefined
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

function getBranchLabel(schema: JsonSchema202012, index: number): string {
  return schema.title?.trim() || `Option ${index + 1}`
}

function getLiteralBranchValue(
  schema: JsonSchema202012,
  root: JsonSchema202012,
): JsonPrimitive | undefined {
  const resolved = resolveSchema(schema, root, undefined)

  if (resolved.const !== undefined) {
    return resolved.const
  }

  if (resolved.enum?.length === 1) {
    return resolved.enum[0]
  }

  return undefined
}

function matchesType(
  value: JsonValue | undefined,
  type: string | string[],
): boolean {
  const expected = Array.isArray(type) ? type : [type]
  const actual = getJsonValueType(value)
  return expected.includes(actual)
}

function getJsonValueType(value: JsonValue | undefined): string {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  switch (typeof value) {
    case 'string':
      return 'string'
    case 'boolean':
      return 'boolean'
    case 'number':
      return Number.isInteger(value) ? 'integer' : 'number'
    case 'object':
      return 'object'
    default:
      return 'undefined'
  }
}

function resolveLocalRefs(
  schema: JsonSchema202012,
  root: JsonSchema202012,
  seen: Set<string>,
): JsonSchema202012 {
  if (!schema.$ref) {
    return schema
  }

  if (!schema.$ref.startsWith('#')) {
    return {
      ...omitSchemaKeys(schema, ['$ref']),
      [REF_ERROR_KEY]: `Unsupported non-local $ref: ${schema.$ref}`,
    }
  }

  if (seen.has(schema.$ref)) {
    return {
      ...omitSchemaKeys(schema, ['$ref']),
      [REF_ERROR_KEY]: `Circular $ref detected: ${schema.$ref}`,
    }
  }

  const target = resolvePointer(root, schema.$ref)

  if (!isSchemaObject(target)) {
    return {
      ...omitSchemaKeys(schema, ['$ref']),
      [REF_ERROR_KEY]: `Unresolved $ref: ${schema.$ref}`,
    }
  }

  const nextSeen = new Set(seen)
  nextSeen.add(schema.$ref)

  return mergeSchemas(
    resolveLocalRefs(target, root, nextSeen),
    omitSchemaKeys(schema, ['$ref']),
  )
}

function resolvePointer(root: JsonSchema202012, ref: string): unknown {
  if (ref === '#') {
    return root
  }

  const parts = ref
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))

  let cursor: unknown = root

  for (const part of parts) {
    if (typeof cursor !== 'object' || cursor === null || !(part in cursor)) {
      return undefined
    }

    cursor = (cursor as Record<string, unknown>)[part]
  }

  return cursor
}

function mergeSchemas(
  base: JsonSchema202012,
  overlay: JsonSchema202012,
): JsonSchema202012 {
  const merged: JsonSchema202012 = { ...base, ...overlay }

  if (base.properties || overlay.properties) {
    merged.properties = { ...(base.properties ?? {}), ...(overlay.properties ?? {}) }
  }

  if (base.$defs || overlay.$defs) {
    merged.$defs = { ...(base.$defs ?? {}), ...(overlay.$defs ?? {}) }
  }

  if (base.patternProperties || overlay.patternProperties) {
    merged.patternProperties = {
      ...(base.patternProperties ?? {}),
      ...(overlay.patternProperties ?? {}),
    }
  }

  if (base.dependentSchemas || overlay.dependentSchemas) {
    merged.dependentSchemas = {
      ...(base.dependentSchemas ?? {}),
      ...(overlay.dependentSchemas ?? {}),
    }
  }

  if (base.dependentRequired || overlay.dependentRequired) {
    const next: Record<string, string[]> = { ...(base.dependentRequired ?? {}) }
    for (const [key, values] of Object.entries(overlay.dependentRequired ?? {})) {
      next[key] = Array.from(new Set([...(next[key] ?? []), ...values]))
    }
    merged.dependentRequired = next
  }

  if (base.required || overlay.required) {
    merged.required = Array.from(
      new Set([...(base.required ?? []), ...(overlay.required ?? [])]),
    )
  }

  return merged
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
