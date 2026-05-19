import type { JsonPrimitive, JsonSchema202012, JsonValue } from "../types.js";
export declare function getLiteralBranchValue(schema: JsonSchema202012, resolveSchema: (schema: JsonSchema202012, root: JsonSchema202012, value: JsonValue | undefined) => JsonSchema202012, root: JsonSchema202012): JsonPrimitive | undefined;
export declare function matchesType(value: unknown, type: string | string[], getJsonValueType: (value: unknown) => string): boolean;
export declare function getJsonValueType(value: unknown): string;
export declare function resolvePointer(root: JsonSchema202012, ref: string): unknown;
export declare function omitSchemaKeys<T extends JsonSchema202012>(schema: T, keys: string[]): T;
export declare function mergeSchemas(base: JsonSchema202012, overlay: JsonSchema202012): JsonSchema202012;
export declare function resolveLocalRefs(schema: JsonSchema202012, root: JsonSchema202012, seen: Set<string>, resolveSchema: (schema: JsonSchema202012, root: JsonSchema202012, value: JsonValue | undefined) => JsonSchema202012): JsonSchema202012;
export declare function isSchemaObject(candidate: unknown): candidate is JsonSchema202012;
//# sourceMappingURL=internal.d.ts.map