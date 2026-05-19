import type { JsonPointerPath, TSchema, JsonValue } from "../types.js";
import { Check } from "typebox/value";
import { isJsonObject } from "../value.js";
import { mergeSchemas, resolveLocalRefs, isSchemaObject } from "./internal.js";

export * from "./internal.js";

export function resolveSchema(
  schema: TSchema,
  root: TSchema,
  value: JsonValue | undefined,
): TSchema {
  let resolved = resolveLocalRefs(schema, root, new Set(), resolveSchema);

  if (resolved.allOf?.length) {
    const base = omitSchemaKeys(resolved, ["allOf"]);
    resolved = resolved.allOf.reduce(
      (merged, branch) => mergeSchemas(merged, resolveSchema(branch, root, value)),
      base,
    );
  }

  if (resolved.if) {
    const branch = matchesSchema(value, resolved.if, root) ? resolved.then : resolved.else;

    resolved = mergeSchemas(
      omitSchemaKeys(resolved, ["if", "then", "else"]),
      branch ? resolveSchema(branch, root, value) : {},
    );
  }

  if (resolved.dependentSchemas && isJsonObject(value)) {
    let merged = resolved;
    for (const [dependency, branch] of Object.entries(resolved.dependentSchemas)) {
      if (dependency in value) {
        merged = mergeSchemas(merged, resolveSchema(branch, root, value));
      }
    }
    resolved = merged;
  }

  return resolved;
}

export function getRequiredProperties(
  schema: TSchema,
  value: JsonValue | undefined,
): Set<string> {
  const required = new Set(schema.required ?? []);

  if (!schema.dependentRequired || !isJsonObject(value)) {
    return required;
  }

  for (const [dependency, fields] of Object.entries(schema.dependentRequired)) {
    if (dependency in value) {
      for (const field of fields) {
        required.add(field);
      }
    }
  }

  return required;
}

export function matchesSchema(
  value: JsonValue | undefined,
  schema: TSchema,
  root: TSchema,
): boolean {
  const resolved = resolveLocalRefs(schema, root, new Set(), resolveSchema);
  return Check(resolved, value);
}

export function getArrayItemSchema(
  schema: TSchema,
  index: number,
): TSchema | undefined {
  if (schema.prefixItems?.[index]) {
    return schema.prefixItems[index];
  }

  if (schema.items === false) {
    return undefined;
  }

  return isSchemaObject(schema.items) ? schema.items : {};
}

export function isObjectSchema(schema: TSchema): boolean {
  return (
    acceptsType(schema, "object") ||
    !!schema.properties ||
    schema.additionalProperties !== undefined
  );
}

export function isArraySchema(schema: TSchema): boolean {
  return acceptsType(schema, "array") || !!schema.prefixItems || schema.items !== undefined;
}

export function acceptsType(schema: TSchema, expected: string): boolean {
  if (!schema.type) {
    return false;
  }

  return Array.isArray(schema.type) ? schema.type.includes(expected) : schema.type === expected;
}

export function humanizeLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (match) => match.toUpperCase());
}

export function pathToKey(path: JsonPointerPath): string {
  if (path.length === 0) {
    return "#";
  }

  return (
    "#/" +
    path.map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")
  );
}

function omitSchemaKeys(schema: TSchema, keys: string[]): TSchema {
  const next = { ...schema };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

