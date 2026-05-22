import { describeUnion, getArrayItemSchema, isArraySchema, isObjectSchema, pathToKey, resolveSchema, createInitialValue, } from "../lib/schema.js";
import { cloneJsonValue, deleteValueAtPath, getValueAtPath, moveArrayItem, setValueAtPath, } from "../lib/value.js";
/**
 * Emits a path-scoped value update by patching `ctx.value` at `path`.
 */
export function updatePathValue(ctx, path, nextValue, schema, commit) {
    const nextRootValue = setValueAtPath(ctx.value, path, nextValue);
    ctx.applyFormValueUpdate(commit ? "both" : "input", path, nextRootValue, schema);
}
export function resetRootValue(ctx) {
    commitRootValue(ctx, [], createInitialValue(ctx.rootSchema), ctx.rootSchema, "both");
}
export function commitRootValue(ctx, path, nextValue, schema, mode) {
    reconcileUiStateWithValue(ctx, nextValue);
    ctx.applyFormValueUpdate(mode, path, nextValue, schema);
}
function reconcileUiStateWithValue(ctx, nextRootValue) {
    const nextBranchSelections = new Map();
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
    const nextCollapsedSections = new Set();
    for (const pathKey of ctx.collapsedSections) {
        const path = parsePathKey(pathKey);
        if (path.length === 0 || getValueAtPath(nextRootValue, path) !== undefined) {
            nextCollapsedSections.add(pathKey);
        }
    }
    ctx.branchSelections = nextBranchSelections;
    ctx.collapsedSections = nextCollapsedSections;
}
function parsePathKey(pathKey) {
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
/**
 * Selects a union branch, sanitizes the current value for that branch, and
 * emits the path update from one shared place.
 */
export function switchUnionBranch(ctx, path, value, branches, index) {
    void value;
    const pathKey = pathToKey(path);
    ctx.branchSelections = new Map(ctx.branchSelections).set(pathKey, index);
    const nextValue = createInitialValue(branches[index], ctx.rootSchema);
    updatePathValue(ctx, path, nextValue, branches[index], true);
    return nextValue;
}
export function addKnownProperty(ctx, objectPath, key, schema) {
    const nextValue = setValueAtPath(ctx.value, [...objectPath, key], createInitialValue(schema, ctx.rootSchema));
    commitRootValue(ctx, [...objectPath, key], nextValue, schema, "both");
}
export function addAdditionalProperty(ctx, objectPath, key, schema) {
    if (!key) {
        return;
    }
    const additionalSchema = getAdditionalPropertySchema(schema);
    const nextValue = setValueAtPath(ctx.value, [...objectPath, key], createInitialValue(additionalSchema, ctx.rootSchema));
    commitRootValue(ctx, [...objectPath, key], nextValue, additionalSchema, "both");
}
export function removeProperty(ctx, path) {
    const nextValue = deleteValueAtPath(ctx.value, path);
    commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
}
export function addArrayItem(ctx, path, schema, index) {
    const itemSchema = getArrayItemSchema(schema, index) ?? {};
    const currentArray = getValueAtPath(ctx.value, path);
    const nextArray = Array.isArray(currentArray)
        ? [...currentArray, createInitialValue(itemSchema, ctx.rootSchema)]
        : [createInitialValue(itemSchema, ctx.rootSchema)];
    const nextValue = setValueAtPath(ctx.value, path, nextArray);
    ctx.pendingFocusId = isSimpleArrayItemSchema(ctx, itemSchema)
        ? createInputId(ctx, [...path, index])
        : undefined;
    commitRootValue(ctx, [...path, index], nextValue, itemSchema, "both");
}
export function removeArrayItem(ctx, path) {
    const nextValue = deleteValueAtPath(ctx.value, path);
    commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
}
export function reorderArrayItem(ctx, path, fromIndex, toIndex, prefixItemsLength = 0) {
    if (fromIndex < prefixItemsLength || toIndex < prefixItemsLength || fromIndex === toIndex) {
        return;
    }
    const nextValue = moveArrayItem(ctx.value, path, fromIndex, toIndex);
    commitRootValue(ctx, path, nextValue, ctx.rootSchema, "both");
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
    const index = Number(rawValue);
    return Number.isInteger(index) && index >= 0 && index < options.length
        ? options[index]
        : rawValue;
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
