import type { JsonPrimitive, TSchema, JsonValue } from "../types.js";
export declare function getLiteralBranchValue(schema: TSchema, resolveSchema: (schema: TSchema, root: TSchema, value: JsonValue | undefined) => TSchema, root: TSchema): JsonPrimitive | undefined;
export declare function matchesType(value: unknown, type: string | string[], getJsonValueType: (value: unknown) => string): boolean;
export declare function getJsonValueType(value: unknown): string;
export declare function resolvePointer(root: TSchema, ref: string): unknown;
export declare function omitSchemaKeys<T extends TSchema>(schema: T, keys: string[]): T;
export declare function mergeSchemas(base: TSchema, overlay: TSchema): TSchema;
export declare function resolveLocalRefs(schema: TSchema, root: TSchema, seen: Set<string>, resolveSchema: (schema: TSchema, root: TSchema, value: JsonValue | undefined) => TSchema): TSchema;
export declare function isSchemaObject(candidate: unknown): candidate is TSchema;
//# sourceMappingURL=internal.d.ts.map