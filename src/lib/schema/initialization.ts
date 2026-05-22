import type { JsonSchema, JsonValue } from "../types.js";
import { isJsonObject } from "../value.js";
import {
  cloneJsonValue,
  isArraySchema,
  isJsonValue,
  isObjectSchema,
} from "./internal.js";
import { getArrayItemSchema, resolveSchema } from "./resolution.js";
import { pickBestBranchIndex } from "./unions.js";

export function createInitialValue(
  schema: JsonSchema,
  root: JsonSchema = schema,
): JsonValue {
  const resolved = resolveSchema(schema, root, undefined);

  if (isJsonValue(resolved.default)) {
    return cloneJsonValue(resolved.default);
  }

  if (isJsonValue(resolved.const)) {
    return cloneJsonValue(resolved.const);
  }

  if (resolved.enum?.length && isJsonValue(resolved.enum[0])) {
    return cloneJsonValue(resolved.enum[0]);
  }

  const branches = resolved.oneOf ?? resolved.anyOf;
  if (branches?.length) {
    return createInitialValue(branches[0], root);
  }

  if (isObjectSchema(resolved)) {
    const next: Record<string, JsonValue> = {};
    const required = new Set(resolved.required ?? []);

    for (const [key, childSchema] of Object.entries(resolved.properties ?? {})) {
      if (required.has(key) || hasOwnDefault(childSchema)) {
        next[key] = createInitialValue(childSchema, root);
      }
    }

    return next;
  }

  if (isArraySchema(resolved)) {
    return [];
  }

  if (acceptsSchemaType(resolved, "boolean")) {
    return false;
  }

  if (acceptsSchemaType(resolved, "number") || acceptsSchemaType(resolved, "integer")) {
    return 0;
  }

  if (acceptsSchemaType(resolved, "null")) {
    return null;
  }

  return "";
}

export function repairValueForSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
  root: JsonSchema = schema,
): JsonValue {
  if (value === undefined) {
    return createInitialValue(schema, root);
  }

  const resolved = resolveSchema(schema, root, value);
  const branches = resolved.oneOf ?? resolved.anyOf;

  if (branches?.length) {
    const branchIndex = pickBestBranchIndex(branches, value, root);
    return repairValueForSchema(branches[branchIndex], value, root);
  }

  if (isObjectSchema(resolved) && isJsonObject(value)) {
    return repairObjectValue(resolved, value, root);
  }

  if (isArraySchema(resolved) && Array.isArray(value)) {
    return repairArrayValue(resolved, value, root);
  }

  return cloneJsonValue(value);
}

function repairObjectValue(
  schema: JsonSchema,
  value: Record<string, JsonValue>,
  root: JsonSchema,
): JsonValue {
  const next: Record<string, JsonValue> = { ...value };
  const required = new Set(schema.required ?? []);

  for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
    if (key in value) {
      next[key] = repairValueForSchema(childSchema, value[key], root);
      continue;
    }

    if (required.has(key) || hasOwnDefault(childSchema)) {
      next[key] = createInitialValue(childSchema, root);
    }
  }

  if (typeof schema.additionalProperties === "object" && schema.additionalProperties !== null) {
    for (const [key, childValue] of Object.entries(value)) {
      if (!(key in (schema.properties ?? {}))) {
        next[key] = repairValueForSchema(schema.additionalProperties, childValue, root);
      }
    }
  }

  return next;
}

function repairArrayValue(schema: JsonSchema, value: JsonValue[], root: JsonSchema): JsonValue {
  return value.map((item, index) => {
    const itemSchema = getArrayItemSchema(schema, index);
    return itemSchema ? repairValueForSchema(itemSchema, item, root) : cloneJsonValue(item);
  });
}

function hasOwnDefault(schema: JsonSchema): boolean {
  return isJsonValue(schema.default) || isJsonValue(schema.const);
}

function acceptsSchemaType(schema: JsonSchema, type: string): boolean {
  if (!schema.type) {
    return false;
  }

  return Array.isArray(schema.type) ? schema.type.includes(type as never) : schema.type === type;
}
