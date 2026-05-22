import type { JsonPointerPath, JsonSchema, JsonValue, JsonSchemaTypeName } from "../types.js";
export * from "./internal.js";
export * from "./evaluate.js";
export declare function resolveSchema(schema: JsonSchema, root: JsonSchema, value: JsonValue | undefined): JsonSchema;
export declare function getRequiredProperties(schema: JsonSchema, value: JsonValue | undefined): Set<string>;
export declare function matchesSchema(value: JsonValue | undefined, schema: JsonSchema, root: JsonSchema): boolean;
export declare function getArrayItemSchema(schema: JsonSchema, index: number): JsonSchema | undefined;
export declare function isObjectSchema(schema: JsonSchema): boolean;
export declare function isArraySchema(schema: JsonSchema): boolean;
export declare function acceptsType(schema: JsonSchema, expected: JsonSchemaTypeName): boolean;
export declare function humanizeLabel(value: string): string;
export declare function pathToKey(path: JsonPointerPath): string;
//# sourceMappingURL=resolution.d.ts.map