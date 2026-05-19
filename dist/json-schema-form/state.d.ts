import type { JsonSchemaFormContext } from "./shared.js";
import type { JsonPointerPath, JsonPrimitive, JsonSchema202012, JsonValue } from "../lib/types.js";
/**
 * Emits a path-scoped value update by patching `ctx.value` at `path`.
 */
export declare function updatePathValue(ctx: JsonSchemaFormContext, path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema202012, commit: boolean): void;
/** Emits `nextValue` as the full form value without applying a path patch. */
export declare function emitWholeValue(ctx: JsonSchemaFormContext, path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema202012): void;
/**
 * Selects a union branch, sanitizes the current value for that branch, and
 * emits the path update from one shared place.
 */
export declare function switchUnionBranch(ctx: JsonSchemaFormContext, path: JsonPointerPath, value: JsonValue | undefined, branches: readonly JsonSchema202012[], rootSchema: JsonSchema202012, index: number): JsonValue;
export declare function addKnownProperty(ctx: JsonSchemaFormContext, objectPath: JsonPointerPath, key: string, schema: JsonSchema202012): void;
export declare function addAdditionalProperty(ctx: JsonSchemaFormContext, objectPath: JsonPointerPath, key: string, schema: JsonSchema202012): void;
export declare function removeProperty(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function addArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath, schema: JsonSchema202012, index: number): void;
export declare function removeArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function reorderArrayItem(ctx: JsonSchemaFormContext, path: JsonPointerPath, fromIndex: number, toIndex: number, prefixItemsLength?: number): void;
export declare function getAdditionalPropertySchema(schema: JsonSchema202012): JsonSchema202012;
export declare function canAddAdditionalProperty(schema: JsonSchema202012): boolean;
export declare function omitObjectProperty(schema: JsonSchema202012, property: string): JsonSchema202012;
export declare function emitValue(ctx: JsonSchemaFormContext, type: "input" | "change", path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema202012): void;
export declare function parseLiteralOption(rawValue: string, options: readonly JsonPrimitive[]): JsonPrimitive;
export declare function createInputId(ctx: Pick<JsonSchemaFormContext, "id">, path: JsonPointerPath): string;
export declare function isCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath): boolean;
export declare function toggleCollapsed(ctx: JsonSchemaFormContext, path: JsonPointerPath): void;
export declare function canCollapseSchema(ctx: JsonSchemaFormContext, schema: JsonSchema202012): boolean;
export declare function isSimpleArrayItemSchema(ctx: JsonSchemaFormContext, schema: JsonSchema202012): boolean;
//# sourceMappingURL=state.d.ts.map