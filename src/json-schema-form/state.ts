import {
  buildInitialValue,
  describeUnion,
  getArrayItemSchema,
  isArraySchema,
  isObjectSchema,
  pathToKey,
  resolveSchema,
} from '../lib/schema.js'
import type { JsonSchemaFormContext } from './shared.js'
import type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonSchemaFormEventDetail,
  JsonValue,
} from '../lib/types.js'
import {
  cloneJsonValue,
  deleteValueAtPath,
  getValueAtPath,
  moveArrayItem,
  setValueAtPath,
} from '../lib/value.js'

export function updatePathValue(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: JsonSchema202012,
  commit: boolean,
) {
  const nextRootValue = setValueAtPath(ctx.value, path, nextValue)
  emitValue(ctx, 'input', path, nextRootValue, schema)

  if (commit) {
    emitValue(ctx, 'change', path, nextRootValue, schema)
  }
}

export function commitRootValue(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: JsonSchema202012,
) {
  emitValue(ctx, 'input', path, nextValue, schema)
  emitValue(ctx, 'change', path, nextValue, schema)
}

export function addKnownProperty(
  ctx: JsonSchemaFormContext,
  objectPath: JsonPointerPath,
  key: string,
  schema: JsonSchema202012,
) {
  const nextValue = setValueAtPath(
    ctx.value,
    [...objectPath, key],
    buildInitialValue(schema, ctx.rootSchema),
  )
  commitRootValue(ctx, [...objectPath, key], nextValue, schema)
}

export function addAdditionalProperty(
  ctx: JsonSchemaFormContext,
  objectPath: JsonPointerPath,
  key: string,
  schema: JsonSchema202012,
) {
  if (!key) {
    return
  }

  const additionalSchema = getAdditionalPropertySchema(schema)
  const nextValue = setValueAtPath(
    ctx.value,
    [...objectPath, key],
    buildInitialValue(additionalSchema, ctx.rootSchema),
  )
  const nextDrafts = new Map(ctx.additionalPropertyDrafts)
  nextDrafts.delete(pathToKey(objectPath))
  ctx.additionalPropertyDrafts = nextDrafts
  commitRootValue(ctx, [...objectPath, key], nextValue, additionalSchema)
}

export function removeProperty(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
) {
  const nextValue = deleteValueAtPath(ctx.value, path)
  commitRootValue(ctx, path, nextValue, ctx.rootSchema)
}

export function addArrayItem(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  schema: JsonSchema202012,
  index: number,
) {
  const itemSchema = getArrayItemSchema(schema, index) ?? {}
  const currentArray = getValueAtPath(ctx.value, path)
  const nextArray = Array.isArray(currentArray)
    ? [...currentArray, buildInitialValue(itemSchema, ctx.rootSchema)]
    : [buildInitialValue(itemSchema, ctx.rootSchema)]
  const nextValue = setValueAtPath(ctx.value, path, nextArray)
  ctx.pendingFocusId = isSimpleArrayItemSchema(ctx, itemSchema)
    ? createInputId([...path, index])
    : undefined
  commitRootValue(ctx, [...path, index], nextValue, itemSchema)
}

export function removeArrayItem(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
) {
  const nextValue = deleteValueAtPath(ctx.value, path)
  commitRootValue(ctx, path, nextValue, ctx.rootSchema)
}

export function reorderArrayItem(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  fromIndex: number,
  toIndex: number,
) {
  const nextValue = moveArrayItem(ctx.value, path, fromIndex, toIndex)
  commitRootValue(ctx, path, nextValue, ctx.rootSchema)
}

export function getAdditionalPropertySchema(
  schema: JsonSchema202012,
): JsonSchema202012 {
  return typeof schema.additionalProperties === 'object' &&
    schema.additionalProperties !== null
    ? schema.additionalProperties
    : {}
}

export function canAddAdditionalProperty(schema: JsonSchema202012): boolean {
  return schema.additionalProperties !== false
}

export function omitObjectProperty(
  schema: JsonSchema202012,
  property: string,
): JsonSchema202012 {
  const next = { ...schema }

  if (schema.properties) {
    const { [property]: _removed, ...rest } = schema.properties
    next.properties = rest
  }

  if (schema.required) {
    next.required = schema.required.filter((entry) => entry !== property)
  }

  return next
}

export function emitValue(
  ctx: JsonSchemaFormContext,
  type: 'input' | 'change',
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: JsonSchema202012,
) {
  const detail: JsonSchemaFormEventDetail = {
    value: cloneJsonValue(nextValue),
    path,
    schema,
  }

  ctx.dispatchEvent(
    new CustomEvent<JsonSchemaFormEventDetail>(type, {
      bubbles: true,
      composed: true,
      detail,
    }),
  )
}

export function parseLiteralOption(
  rawValue: string,
  options: readonly JsonPrimitive[],
): JsonPrimitive {
  return options.find((option) => String(option) === rawValue) ?? rawValue
}

export function createInputId(path: JsonPointerPath): string {
  return `lipstick-${pathToKey(path).replaceAll(/[^a-z0-9_-]/gi, '-')}`
}

export function isCollapsed(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
): boolean {
  return ctx.collapsedSections.has(pathToKey(path))
}

export function toggleCollapsed(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
) {
  const key = pathToKey(path)
  const next = new Set(ctx.collapsedSections)

  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }

  ctx.collapsedSections = next
}

export function canCollapseSchema(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
): boolean {
  const resolved = resolveSchema(schema, ctx.rootSchema, undefined)
  return Boolean(
    describeUnion(resolved, undefined, ctx.rootSchema) ||
      isObjectSchema(resolved) ||
      isArraySchema(resolved),
  )
}

function isSimpleArrayItemSchema(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
): boolean {
  const resolved = resolveSchema(schema, ctx.rootSchema, undefined)
  return !(
    describeUnion(resolved, undefined, ctx.rootSchema) ||
    isObjectSchema(resolved) ||
    isArraySchema(resolved)
  )
}
