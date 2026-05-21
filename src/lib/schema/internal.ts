import type { JsonPrimitive, TSchema, JsonValue } from "../types.js";

export function getLiteralBranchValue(
  schema: TSchema,
  resolveSchema: (
    schema: TSchema,
    root: TSchema,
    value: JsonValue | undefined,
  ) => TSchema,
  root: TSchema,
): JsonPrimitive | undefined {
  const resolved = resolveSchema(schema, root, undefined);

  if (resolved.const !== undefined) {
    return resolved.const;
  }

  if (resolved.enum?.length === 1) {
    return resolved.enum[0];
  }

  return undefined;
}

export function matchesType(
  value: unknown,
  type: string | string[],
  getJsonValueType: (value: unknown) => string,
): boolean {
  const expected = Array.isArray(type) ? type : [type];
  const actual = getJsonValueType(value);
  if (actual === "integer" && expected.includes("number")) {
    return true;
  }
  return expected.includes(actual);
}

export function getJsonValueType(value: unknown): string {
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

export function omitSchemaKeys<T extends TSchema>(schema: T, keys: string[]): T {
  const next = { ...schema };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

export function mergeSchemas(base: TSchema, overlay: TSchema): TSchema {
  const merged: TSchema = { ...base, ...overlay };

  if (base.properties || overlay.properties) {
    merged.properties = {
      ...(base.properties ?? {}),
      ...(overlay.properties ?? {}),
    };
  }

  if (base.$defs || overlay.$defs) {
    merged.$defs = { ...(base.$defs ?? {}), ...(overlay.$defs ?? {}) };
  }

  if (base.patternProperties || overlay.patternProperties) {
    merged.patternProperties = {
      ...(base.patternProperties ?? {}),
      ...(overlay.patternProperties ?? {}),
    };
  }

  if (base.dependentSchemas || overlay.dependentSchemas) {
    merged.dependentSchemas = {
      ...(base.dependentSchemas ?? {}),
      ...(overlay.dependentSchemas ?? {}),
    };
  }

  if (base.dependentRequired || overlay.dependentRequired) {
    const next: Record<string, string[]> = {
      ...(base.dependentRequired ?? {}),
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

export function resolveLocalRefs(
  schema: TSchema,
  _root: TSchema,
  _seen: Set<string>,
  resolveSchema: (
    schema: TSchema,
    root: TSchema,
    value: JsonValue | undefined,
  ) => TSchema,
): TSchema {
  void resolveSchema;
  return schema;
}

export function isSchemaObject(candidate: unknown): candidate is TSchema {
  return typeof candidate === "object" && candidate !== null;
}

