import {
  describeUnion,
  getArrayItemSchema,
  isArraySchema,
  isObjectSchema,
  pathToKey,
  resolveSchema,
} from "../lib/schema.js";
import type { JsonSchemaFormContext } from "./shared.js";
import type {
  JsonPointerPath,
  JsonPrimitive,
  TSchema,
  JsonSchemaFormEventDetail,
  JsonValue,
} from "../lib/types.js";
import {
  cloneJsonValue,
  deleteValueAtPath,
  getValueAtPath,
  moveArrayItem,
  setValueAtPath,
} from "../lib/value.js";
import { Value } from "typebox/value";

/**
 * Emits a path-scoped value update by patching `ctx.value` at `path`.
 */
export function updatePathValue(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: TSchema,
  commit: boolean,
) {
  const nextRootValue = setValueAtPath(ctx.value, path, nextValue);
  ctx.applyFormValueUpdate(commit ? "both" : "input", path, nextRootValue, schema);
}

export function resetRootValue(ctx: JsonSchemaFormContext) {
  commitRootValue(
    ctx,
    [],
    Value.Repair(ctx.rootSchema, undefined) as JsonValue,
    ctx.rootSchema,
    "both",
  );
}

export function commitRootValue(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: TSchema,
  mode: "input" | "change" | "both",
) {
  reconcileUiStateWithValue(ctx, nextValue);
  ctx.applyFormValueUpdate(mode, path, nextValue, schema);
}

function reconcileUiStateWithValue(ctx: JsonSchemaFormContext, nextRootValue: JsonValue) {
  const nextBranchSelections = new Map<string, number>();
  for (const [pathKey] of ctx.branchSelections) {
    const path = parsePathKey(pathKey);
    const nodeValue = getValueAtPath(nextRootValue, path);
    if (nodeValue === undefined) {
      continue;
    }

    const nodeSchema = resolveSchemaForPath(ctx, path, nextRootValue);
    if (!nodeSchema) {
      continue;
    }
    const union = describeUnion(nodeSchema, nodeValue, ctx.rootSchema);
    if (!union) {
      continue;
    }

    nextBranchSelections.set(pathKey, union.selectedIndex);
  }

  const nextCollapsedSections = new Set<string>();
  for (const pathKey of ctx.collapsedSections) {
    const path = parsePathKey(pathKey);
    if (path.length === 0 || getValueAtPath(nextRootValue, path) !== undefined) {
      nextCollapsedSections.add(pathKey);
    }
  }

  const nextDrafts = new Map<string, string>();
  for (const [pathKey, draft] of ctx.additionalPropertyDrafts) {
    const path = parsePathKey(pathKey);
    const nodeValue = path.length === 0 ? nextRootValue : getValueAtPath(nextRootValue, path);
    if (isPlainObject(nodeValue)) {
      nextDrafts.set(pathKey, draft);
    }
  }

  ctx.branchSelections = nextBranchSelections;
  ctx.collapsedSections = nextCollapsedSections;
  ctx.additionalPropertyDrafts = nextDrafts;
}

function parsePathKey(pathKey: string): JsonPointerPath {
  if (pathKey === "#" || pathKey === "") {
    return [];
  }
  const rawSegments = pathKey.replace(/^#\//, "").split("/");
  return rawSegments.map((segment) => {
    const decoded = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    const asIndex = Number(decoded);
    return Number.isInteger(asIndex) && String(asIndex) === decoded ? asIndex : decoded;
  });
}
function resolveSchemaForPath(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  rootValue: JsonValue,
): TSchema | undefined {
  let currentSchema: TSchema = ctx.rootSchema;
  let currentPath: JsonPointerPath = [];

  for (const segment of path) {
    const currentValue = getValueAtPath(rootValue, currentPath);
    const resolved = resolveSchema(currentSchema, ctx.rootSchema, currentValue);

    if (typeof segment === "number") {
      if (!isArraySchema(resolved)) {
        return undefined;
      }
      currentSchema = getArrayItemSchema(resolved, segment) ?? {};
      currentPath = [...currentPath, segment];
      continue;
    }

    if (!isObjectSchema(resolved)) {
      return undefined;
    }
    currentSchema =
      resolved.properties?.[segment] ??
      (typeof resolved.additionalProperties === "object" ? resolved.additionalProperties : {});
    currentPath = [...currentPath, segment];
  }

  return resolveSchema(currentSchema, ctx.rootSchema, getValueAtPath(rootValue, path));
}

function isPlainObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Selects a union branch, sanitizes the current value for that branch, and
 * emits the path update from one shared place.
 */
export function switchUnionBranch(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  value: JsonValue | undefined,
  branches: readonly TSchema[],
  index: number,
) {
  const pathKey = pathToKey(path);
  ctx.branchSelections = new Map(ctx.branchSelections).set(pathKey, index);
  const nextValue = Value.Repair(branches[index], value) as JsonValue;
  updatePathValue(ctx, path, nextValue, branches[index], true);

  return nextValue;
}

export function addKnownProperty(
  ctx: JsonSchemaFormContext,
  objectPath: JsonPointerPath,
  key: string,
  schema: TSchema,
) {
  const nextValue = setValueAtPath(
    ctx.value,
    [...objectPath, key],
    Value.Repair(schema, undefined) as JsonValue,
  );
  commitRootValue(ctx, [...objectPath, key], nextValue, schema, "both");
}

export function addAdditionalProperty(
  ctx: JsonSchemaFormContext,
  objectPath: JsonPointerPath,
  key: string,
  schema: TSchema,
) {
  if (!key) {
    return;
  }

  const additionalSchema = getAdditionalPropertySchema(schema);
  const nextValue = setValueAtPath(
    ctx.value,
    [...objectPath, key],
    Value.Repair(additionalSchema, undefined) as JsonValue,
  );
  const nextDrafts = new Map(ctx.additionalPropertyDrafts);
  nextDrafts.delete(pathToKey(objectPath));
  ctx.additionalPropertyDrafts = nextDrafts;
  commitRootValue(ctx, [...objectPath, key], nextValue, additionalSchema, "both");
}

export function removeProperty(ctx: JsonSchemaFormContext, path: JsonPointerPath) {
  const nextValue = deleteValueAtPath(ctx.value, path);
  commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
}

export function addArrayItem(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  schema: TSchema,
  index: number,
) {
  const itemSchema = getArrayItemSchema(schema, index) ?? {};
  const currentArray = getValueAtPath(ctx.value, path);
  const nextArray = Array.isArray(currentArray)
    ? [...currentArray, Value.Repair(itemSchema, undefined) as JsonValue]
    : [(Value.Repair(itemSchema, undefined) as JsonValue)];
  const nextValue = setValueAtPath(ctx.value, path, nextArray);
  ctx.pendingFocusId = isSimpleArrayItemSchema(ctx, itemSchema)
    ? createInputId(ctx, [...path, index])
    : undefined;
  commitRootValue(ctx, [...path, index], nextValue, itemSchema, "both");
}

export function removeArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath) {
  const nextValue = deleteValueAtPath(ctx.value, path);
  commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
}

export function reorderArrayItem(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  fromIndex: number,
  toIndex: number,
  prefixItemsLength = 0,
) {
  if (fromIndex < prefixItemsLength || toIndex < prefixItemsLength || fromIndex === toIndex) {
    return;
  }

  const nextValue = moveArrayItem(ctx.value, path, fromIndex, toIndex);
  commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
}

export function getAdditionalPropertySchema(schema: TSchema): TSchema {
  return typeof schema.additionalProperties === "object" && schema.additionalProperties !== null
    ? schema.additionalProperties
    : {};
}

export function canAddAdditionalProperty(schema: TSchema): boolean {
  return schema.additionalProperties !== false;
}

export function omitObjectProperty(schema: TSchema, property: string): TSchema {
  const next = { ...schema };

  if (schema.properties) {
    const { [property]: _removed, ...rest } = schema.properties;
    next.properties = rest;
  }

  if (schema.required) {
    next.required = schema.required.filter((entry) => entry !== property);
  }

  return next;
}

export function emitValue(
  ctx: JsonSchemaFormContext,
  type: "input" | "change",
  path: JsonPointerPath,
  nextValue: JsonValue,
  schema: TSchema,
) {
  const detail: JsonSchemaFormEventDetail = {
    value: cloneJsonValue(nextValue),
    path,
    schema,
  };

  ctx.dispatchEvent(
    new CustomEvent<JsonSchemaFormEventDetail>(type, {
      bubbles: true,
      composed: true,
      detail,
    }),
  );
}

export function parseLiteralOption(
  rawValue: string,
  options: readonly JsonPrimitive[],
): JsonPrimitive {
  return options.find((option) => String(option) === rawValue) ?? rawValue;
}

export function createInputId(
  ctx: Pick<JsonSchemaFormContext, "id">,
  path: JsonPointerPath,
): string {
  const formIdPrefix = ctx.id?.trim() || "lipstick";
  const pathKey = pathToKey(path);
  if (pathKey === "#") {
    return `${formIdPrefix}-lipstick-root`;
  }

  const normalizedPathKey = pathKey
    .replace(/^#\//, "")
    .replaceAll(/[^a-z0-9_-]/gi, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `${formIdPrefix}-lipstick-${normalizedPathKey || "root"}`;
}

export function isCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath): boolean {
  return ctx.collapsedSections.has(pathToKey(path));
}

export function toggleCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath) {
  const key = pathToKey(path);
  const next = new Set(ctx.collapsedSections);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  ctx.collapsedSections = next;
}

export function canCollapseSchema(ctx: JsonSchemaFormContext, schema: TSchema): boolean {
  const resolved = resolveSchema(schema, ctx.rootSchema, undefined);
  return Boolean(
    describeUnion(resolved, undefined, ctx.rootSchema) ||
    isObjectSchema(resolved) ||
    isArraySchema(resolved),
  );
}

export function isSimpleArrayItemSchema(ctx: JsonSchemaFormContext, schema: TSchema): boolean {
  const resolved = resolveSchema(schema, ctx.rootSchema, undefined);
  return !(
    describeUnion(resolved, undefined, ctx.rootSchema) ||
    isObjectSchema(resolved) ||
    isArraySchema(resolved)
  );
}
