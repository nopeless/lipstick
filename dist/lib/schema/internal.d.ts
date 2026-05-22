import type { JsonPrimitive, JsonSchema, JsonSchemaTypeName, JsonValue } from "../types.js";
export declare function getLiteralBranchValue(schema: JsonSchema, resolveSchema: (schema: JsonSchema, root: JsonSchema, value: JsonValue | undefined) => JsonSchema, root: JsonSchema): JsonPrimitive | undefined;
export declare function matchesType(value: unknown, type: JsonSchemaTypeName | JsonSchemaTypeName[], getJsonValueType: (value: unknown) => JsonSchemaTypeName | "undefined"): boolean;
export declare function getJsonValueType(value: unknown): JsonSchemaTypeName | "undefined";
export declare function acceptsType(schema: JsonSchema, expected: JsonSchemaTypeName): boolean;
export declare function jsonValueEquals(left: unknown, right: unknown): boolean;
export declare function cloneJsonValue<T extends JsonValue>(value: T): T;
export declare function isJsonValue(value: unknown): value is JsonValue;
export declare function isJsonPrimitive(value: unknown): value is JsonPrimitive;
export declare function omitSchemaKeys<T extends JsonSchema>(schema: T, keys: string[]): T;
export declare function mergeSchemas(base: JsonSchema, overlay: JsonSchema): JsonSchema;
export declare function isObjectSchema(schema: JsonSchema): boolean;
export declare function isArraySchema(schema: JsonSchema): boolean;
export declare function isSchemaObject(candidate: unknown): candidate is JsonSchema;
export declare function findUnsupportedRef(schema: JsonSchema): string | undefined;
//# sourceMappingURL=internal.d.ts.map