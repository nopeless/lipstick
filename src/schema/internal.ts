import type { JsonPrimitive, JsonSchema, JsonSchemaTypeName, JsonValue } from "../types.js";

export function getLiteralBranchValue(
  schema: JsonSchema,
  resolveSchema: (
    schema: JsonSchema,
    root: JsonSchema,
    value: JsonValue | undefined,
  ) => JsonSchema,
  root: JsonSchema,
): JsonPrimitive | undefined {
  const resolved = resolveSchema(schema, root, undefined);

  if (isJsonPrimitive(resolved.const)) {
    return resolved.const;
  }

  if (resolved.enum?.length === 1 && isJsonPrimitive(resolved.enum[0])) {
    return resolved.enum[0];
  }

  return undefined;
}

export function matchesType(
  value: unknown,
  type: JsonSchemaTypeName | JsonSchemaTypeName[],
  getJsonValueType: (value: unknown) => JsonSchemaTypeName | "undefined",
): boolean {
  const expected = Array.isArray(type) ? type : [type];
  const actual = getJsonValueType(value);
  if (actual === "integer" && expected.includes("number")) {
    return true;
  }
  if (actual === "undefined") {
    return false;
  }
  return expected.includes(actual);
}

export function getJsonValueType(value: unknown): JsonSchemaTypeName | "undefined" {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  switch (typeof value) {
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    case "object":
      return "object";
    default:
      return "undefined";
  }
}

export function acceptsType(schema: JsonSchema, expected: JsonSchemaTypeName): boolean {
  if (!schema.type) {
    return false;
  }

  return Array.isArray(schema.type) ? schema.type.includes(expected) : schema.type === expected;
}

export function jsonValueEquals(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Number.isNaN(left) && Number.isNaN(right)) {
    return true;
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => jsonValueEquals(item, right[index]));
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => key in right && jsonValueEquals(left[key], right[key]));
}

export function cloneJsonValue<T extends JsonValue>(value: T): T {
  return structuredClone(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value as number) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function omitSchemaKeys<T extends JsonSchema>(schema: T, keys: string[]): T {
  const next = { ...schema };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

export function mergeSchemas(base: JsonSchema, overlay: JsonSchema): JsonSchema {
  const merged: JsonSchema = { ...base, ...overlay };

  if (base.properties || overlay.properties) {
    merged.properties = {
      ...base.properties,
      ...overlay.properties,
    };
  }

  if (base.$defs || overlay.$defs) {
    merged.$defs = { ...base.$defs, ...overlay.$defs };
  }

  if (base.patternProperties || overlay.patternProperties) {
    merged.patternProperties = {
      ...base.patternProperties,
      ...overlay.patternProperties,
    };
  }

  if (base.dependentSchemas || overlay.dependentSchemas) {
    merged.dependentSchemas = {
      ...base.dependentSchemas,
      ...overlay.dependentSchemas,
    };
  }

  if (base.dependentRequired || overlay.dependentRequired) {
    const next: Record<string, string[]> = {
      ...base.dependentRequired,
    };
    for (const [key, values] of Object.entries(overlay.dependentRequired ?? {})) {
      next[key] = Array.from(new Set([...(next[key] ?? []), ...values]));
    }
    merged.dependentRequired = next;
  }

  if (base.required || overlay.required) {
    merged.required = Array.from(new Set([...(base.required ?? []), ...(overlay.required ?? [])]));
  }

  return merged;
}

export function isObjectSchema(schema: JsonSchema): boolean {
  return (
    acceptsType(schema, "object") ||
    !!schema.properties ||
    schema.additionalProperties !== undefined
  );
}

export function isArraySchema(schema: JsonSchema): boolean {
  return acceptsType(schema, "array") || !!schema.prefixItems || schema.items !== undefined;
}

export function isSchemaObject(candidate: unknown): candidate is JsonSchema {
  return isRecord(candidate) && !Array.isArray(candidate);
}

export function findUnsupportedRef(schema: JsonSchema): string | undefined {
  return findUnsupportedRefInValue(schema, "#");
}

function findUnsupportedRefInValue(candidate: unknown, path: string): string | undefined {
  if (!isSchemaObject(candidate)) {
    return undefined;
  }

  if (typeof candidate.$ref === "string") {
    return path;
  }

  const schemaKeys = [
    "properties",
    "patternProperties",
    "$defs",
    "dependentSchemas",
  ] as const;

  for (const key of schemaKeys) {
    const value = candidate[key];
    if (!isRecord(value)) {
      continue;
    }

    for (const [childKey, child] of Object.entries(value)) {
      const found = findUnsupportedRefInValue(child, `${path}/${escapePointerSegment(key)}/${escapePointerSegment(childKey)}`);
      if (found) {
        return found;
      }
    }
  }

  const arrayKeys = ["prefixItems", "oneOf", "anyOf", "allOf"] as const;
  for (const key of arrayKeys) {
    const value = candidate[key];
    if (!Array.isArray(value)) {
      continue;
    }

    for (let index = 0; index < value.length; index += 1) {
      const found = findUnsupportedRefInValue(value[index], `${path}/${escapePointerSegment(key)}/${index}`);
      if (found) {
        return found;
      }
    }
  }

  for (const key of ["items", "additionalProperties", "if", "then", "else"] as const) {
    const value = candidate[key];
    if (typeof value === "object" && value !== null) {
      const found = findUnsupportedRefInValue(value, `${path}/${escapePointerSegment(key)}`);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}


