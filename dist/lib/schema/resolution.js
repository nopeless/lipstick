import { isJsonObject } from "../value.js";
import { acceptsType as acceptsSchemaType, isArraySchema as isArraySchemaInternal, isObjectSchema as isObjectSchemaInternal, isSchemaObject, mergeSchemas, omitSchemaKeys, } from "./internal.js";
import { isValueValidAgainstSchema } from "./evaluate.js";
export * from "./internal.js";
export * from "./evaluate.js";
export function resolveSchema(schema, root, value) {
    let resolved = schema;
    if (resolved.allOf?.length) {
        const base = omitSchemaKeys(resolved, ["allOf"]);
        resolved = resolved.allOf.reduce((merged, branch) => mergeSchemas(merged, resolveSchema(branch, root, value)), base);
    }
    if (resolved.if) {
        const branch = matchesSchema(value, resolved.if, root) ? resolved.then : resolved.else;
        resolved = mergeSchemas(omitSchemaKeys(resolved, ["if", "then", "else"]), branch ? resolveSchema(branch, root, value) : {});
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
export function getRequiredProperties(schema, value) {
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
export function matchesSchema(value, schema, root) {
    return isValueValidAgainstSchema(schema, value, root);
}
export function getArrayItemSchema(schema, index) {
    if (schema.prefixItems?.[index]) {
        return schema.prefixItems[index];
    }
    if (schema.items === false) {
        return undefined;
    }
    return isSchemaObject(schema.items) ? schema.items : {};
}
export function isObjectSchema(schema) {
    return isObjectSchemaInternal(schema);
}
export function isArraySchema(schema) {
    return isArraySchemaInternal(schema);
}
export function acceptsType(schema, expected) {
    return acceptsSchemaType(schema, expected);
}
export function humanizeLabel(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\w/, (match) => match.toUpperCase());
}
export function pathToKey(path) {
    if (path.length === 0) {
        return "#";
    }
    return ("#/" +
        path.map((segment) => String(segment).replaceAll("~", "~0").replaceAll("/", "~1")).join("/"));
}
