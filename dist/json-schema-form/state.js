import { describeUnion, getArrayItemSchema, isArraySchema, isObjectSchema, pathToKey, resolveSchema, } from "../lib/schema.js";
import { cloneJsonValue, deleteValueAtPath, getValueAtPath, moveArrayItem, setValueAtPath, } from "../lib/value.js";
import { Value } from "typebox/value";
/**
 * Emits a path-scoped value update by patching `ctx.value` at `path`.
 */
export function updatePathValue(ctx, path, nextValue, schema, commit) {
    const nextRootValue = setValueAtPath(ctx.value, path, nextValue);
    ctx.applyFormValueUpdate(commit ? "both" : "input", path, nextRootValue, schema);
}
/** Emits `nextValue` as the full form value without applying a path patch. */
export function emitWholeValue(ctx, path, nextValue, schema) {
    commitRootValue(ctx, path, nextValue, schema, "both");
}
export function resetRootValue(ctx) {
    commitRootValue(ctx, [], Value.Repair(ctx.rootSchema, undefined), ctx.rootSchema, "both");
}
export function commitRootValue(ctx, path, nextValue, schema, mode) {
    reconcileUiStateWithValue(ctx, nextValue);
    ctx.applyFormValueUpdate(mode, path, nextValue, schema);
}
function reconcileUiStateWithValue(ctx, nextRootValue) {
    const nextBranchSelections = new Map();
    for (const [pathKey] of ctx.branchSelections) {
        const path = pathKeyToPath(pathKey);
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
    const nextCollapsedSections = new Set();
    for (const pathKey of ctx.collapsedSections) {
        const path = pathKeyToPath(pathKey);
        if (path.length === 0 || getValueAtPath(nextRootValue, path) !== undefined) {
            nextCollapsedSections.add(pathKey);
        }
    }
    const nextDrafts = new Map();
    for (const [pathKey, draft] of ctx.additionalPropertyDrafts) {
        const path = pathKeyToPath(pathKey);
        const nodeValue = path.length === 0 ? nextRootValue : getValueAtPath(nextRootValue, path);
        if (isPlainObject(nodeValue)) {
            nextDrafts.set(pathKey, draft);
        }
    }
    ctx.branchSelections = nextBranchSelections;
    ctx.collapsedSections = nextCollapsedSections;
    ctx.additionalPropertyDrafts = nextDrafts;
}
function pathKeyToPath(pathKey) {
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
function resolveSchemaForPath(ctx, path, rootValue) {
    let currentSchema = ctx.rootSchema;
    let currentPath = [];
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
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Selects a union branch, sanitizes the current value for that branch, and
 * emits the path update from one shared place.
 */
export function switchUnionBranch(ctx, path, value, branches, index) {
    const pathKey = pathToKey(path);
    ctx.branchSelections = new Map(ctx.branchSelections).set(pathKey, index);
    const nextValue = Value.Repair(branches[index], value);
    updatePathValue(ctx, path, nextValue, branches[index], true);
    return nextValue;
}
export function addKnownProperty(ctx, objectPath, key, schema) {
    const nextValue = setValueAtPath(ctx.value, [...objectPath, key], Value.Repair(schema, undefined));
    emitWholeValue(ctx, [...objectPath, key], nextValue, schema);
}
export function addAdditionalProperty(ctx, objectPath, key, schema) {
    if (!key) {
        return;
    }
    const additionalSchema = getAdditionalPropertySchema(schema);
    const nextValue = setValueAtPath(ctx.value, [...objectPath, key], Value.Repair(additionalSchema, undefined));
    const nextDrafts = new Map(ctx.additionalPropertyDrafts);
    nextDrafts.delete(pathToKey(objectPath));
    ctx.additionalPropertyDrafts = nextDrafts;
    emitWholeValue(ctx, [...objectPath, key], nextValue, additionalSchema);
}
export function removeProperty(ctx, path) {
    const nextValue = deleteValueAtPath(ctx.value, path);
    emitWholeValue(ctx, path, nextValue, ctx.rootSchema);
}
export function addArrayItem(ctx, path, schema, index) {
    const itemSchema = getArrayItemSchema(schema, index) ?? {};
    const currentArray = getValueAtPath(ctx.value, path);
    const nextArray = Array.isArray(currentArray)
        ? [...currentArray, Value.Repair(itemSchema, undefined)]
        : [Value.Repair(itemSchema, undefined)];
    const nextValue = setValueAtPath(ctx.value, path, nextArray);
    ctx.pendingFocusId = isSimpleArrayItemSchema(ctx, itemSchema)
        ? createInputId(ctx, [...path, index])
        : undefined;
    emitWholeValue(ctx, [...path, index], nextValue, itemSchema);
}
export function removeArrayItem(ctx, path) {
    const nextValue = deleteValueAtPath(ctx.value, path);
    emitWholeValue(ctx, path, nextValue, ctx.rootSchema);
}
export function reorderArrayItem(ctx, path, fromIndex, toIndex, prefixItemsLength = 0) {
    if (fromIndex < prefixItemsLength || toIndex < prefixItemsLength || fromIndex === toIndex) {
        return;
    }
    const nextValue = moveArrayItem(ctx.value, path, fromIndex, toIndex);
    emitWholeValue(ctx, path, nextValue, ctx.rootSchema);
}
export function getAdditionalPropertySchema(schema) {
    return typeof schema.additionalProperties === "object" && schema.additionalProperties !== null
        ? schema.additionalProperties
        : {};
}
export function canAddAdditionalProperty(schema) {
    return schema.additionalProperties !== false;
}
export function omitObjectProperty(schema, property) {
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
export function emitValue(ctx, type, path, nextValue, schema) {
    const detail = {
        value: cloneJsonValue(nextValue),
        path,
        schema,
    };
    ctx.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail,
    }));
}
export function parseLiteralOption(rawValue, options) {
    return options.find((option) => String(option) === rawValue) ?? rawValue;
}
export function createInputId(ctx, path) {
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
export function isCollapsed(ctx, path) {
    return ctx.collapsedSections.has(pathToKey(path));
}
export function toggleCollapsed(ctx, path) {
    const key = pathToKey(path);
    const next = new Set(ctx.collapsedSections);
    if (next.has(key)) {
        next.delete(key);
    }
    else {
        next.add(key);
    }
    ctx.collapsedSections = next;
}
export function canCollapseSchema(ctx, schema) {
    const resolved = resolveSchema(schema, ctx.rootSchema, undefined);
    return Boolean(describeUnion(resolved, undefined, ctx.rootSchema) ||
        isObjectSchema(resolved) ||
        isArraySchema(resolved));
}
export function isSimpleArrayItemSchema(ctx, schema) {
    const resolved = resolveSchema(schema, ctx.rootSchema, undefined);
    return !(describeUnion(resolved, undefined, ctx.rootSchema) ||
        isObjectSchema(resolved) ||
        isArraySchema(resolved));
}
