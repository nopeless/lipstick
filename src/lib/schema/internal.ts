import type { JsonPrimitive, JsonSchema202012, JsonValue } from "../types.js";

export function getLiteralBranchValue(
  schema: JsonSchema202012,
  resolveSchema: (
    schema: JsonSchema202012,
    root: JsonSchema202012,
    value: JsonValue | undefined,
  ) => JsonSchema202012,
  root: JsonSchema202012,
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

export function resolvePointer(root: JsonSchema202012, ref: string): unknown {
  if (ref === "#") {
    return root;
  }

  const parts = ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));

  let cursor: unknown = root;

  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[part];
  }

  return cursor;
}

export function omitSchemaKeys<T extends JsonSchema202012>(schema: T, keys: string[]): T {
  const next = { ...schema };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

export function mergeSchemas(base: JsonSchema202012, overlay: JsonSchema202012): JsonSchema202012 {
  const merged: JsonSchema202012 = { ...base, ...overlay };

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
  schema: JsonSchema202012,
  root: JsonSchema202012,
  seen: Set<string>,
  resolveSchema: (
    schema: JsonSchema202012,
    root: JsonSchema202012,
    value: JsonValue | undefined,
  ) => JsonSchema202012,
): JsonSchema202012 {
  if (!schema.$ref) {
    return schema;
  }

  if (!schema.$ref.startsWith("#")) {
    return omitSchemaKeys(schema, ["$ref"]);
  }

  if (seen.has(schema.$ref)) {
    return omitSchemaKeys(schema, ["$ref"]);
  }

  const target = resolvePointer(root, schema.$ref);

  if (!isSchemaObject(target)) {
    return omitSchemaKeys(schema, ["$ref"]);
  }

  const nextSeen = new Set(seen);
  nextSeen.add(schema.$ref);

  return mergeSchemas(
    resolveLocalRefs(target, root, nextSeen, resolveSchema),
    omitSchemaKeys(schema, ["$ref"]),
  );
}

export function isSchemaObject(candidate: unknown): candidate is JsonSchema202012 {
  return typeof candidate === "object" && candidate !== null;
}
