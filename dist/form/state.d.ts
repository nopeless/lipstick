import type { JsonSchemaFormContext } from "./context.js";
import type { JsonPointerPath, JsonSchema, JsonValue } from "../types.js";
/**
 * Emits a path-scoped value update by patching `ctx.value` at `path`.
 */
export declare function updatePathValue(ctx: JsonSchemaFormContext, path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema, commit: boolean): void;
export declare function resetRootValue(ctx: JsonSchemaFormContext): void;
export declare function commitRootValue(ctx: JsonSchemaFormContext, path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema, mode: "input" | "change" | "both"): void;
/**
 * Selects a union branch, sanitizes the current value for that branch, and
 * emits the path update from one shared place.
 */
export declare function switchUnionBranch(ctx: JsonSchemaFormContext, path: JsonPointerPath, value: JsonValue | undefined, branches: readonly JsonSchema[], index: number): JsonValue;
export declare function addKnownProperty(ctx: JsonSchemaFormContext, objectPath: JsonPointerPath, key: string, schema: JsonSchema): void;
export declare function addAdditionalProperty(ctx: JsonSchemaFormContext, objectPath: JsonPointerPath, key: string, schema: JsonSchema): void;
export declare function removeProperty(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function addArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath, schema: JsonSchema, index: number): void;
export declare function removeArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function reorderArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath, fromIndex: number, toIndex: number, prefixItemsLength?: number): void;
export declare function getAdditionalPropertySchema(schema: JsonSchema): JsonSchema;
export declare function canAddAdditionalProperty(schema: JsonSchema): boolean;
export declare function omitObjectProperty(schema: JsonSchema, property: string): JsonSchema;
export declare function emitValue(ctx: JsonSchemaFormContext, type: "input" | "change", path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema): void;
export declare function parseLiteralOption(rawValue: string, options: readonly JsonValue[]): JsonValue;
export declare function createInputId(ctx: Pick<JsonSchemaFormContext, "id">, path: JsonPointerPath): string;
export declare function isCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath): boolean;
export declare function toggleCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function canCollapseSchema(ctx: JsonSchemaFormContext, schema: JsonSchema): boolean;
export declare function isSimpleArrayItemSchema(ctx: JsonSchemaFormContext, schema: JsonSchema): boolean;
//# sourceMappingURL=state.d.ts.map