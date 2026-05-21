export function getLiteralBranchValue(schema, resolveSchema, root) {
    const resolved = resolveSchema(schema, root, undefined);
    if (resolved.const !== undefined) {
        return resolved.const;
    }
    if (resolved.enum?.length === 1) {
        return resolved.enum[0];
    }
    return undefined;
}
export function matchesType(value, type, getJsonValueType) {
    const expected = Array.isArray(type) ? type : [type];
    const actual = getJsonValueType(value);
    if (actual === "integer" && expected.includes("number")) {
        return true;
    }
    return expected.includes(actual);
}
export function getJsonValueType(value) {
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
export function omitSchemaKeys(schema, keys) {
    const next = { ...schema };
    keys.forEach((key) => {
        delete next[key];
    });
    return next;
}
export function mergeSchemas(base, overlay) {
    const merged = { ...base, ...overlay };
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
        const next = {
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
export function resolveLocalRefs(schema, _root, _seen, resolveSchema) {
    void resolveSchema;
    return schema;
}
export function isSchemaObject(candidate) {
    return typeof candidate === "object" && candidate !== null;
}
