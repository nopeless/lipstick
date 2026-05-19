import type { JsonPointerPath, TSchema, JsonValue } from "../types.js";
export * from "./internal.js";
export declare function resolveSchema(schema: TSchema, root: TSchema, value: JsonValue | undefined): TSchema;
export declare function getRequiredProperties(schema: TSchema, value: JsonValue | undefined): Set<string>;
export declare function matchesSchema(value: JsonValue | undefined, schema: TSchema, root: TSchema): boolean;
export declare function getArrayItemSchema(schema: TSchema, index: number): TSchema | undefined;
export declare function isObjectSchema(schema: TSchema): boolean;
export declare function isArraySchema(schema: TSchema): boolean;
export declare function acceptsType(schema: TSchema, expected: string): boolean;
export declare function humanizeLabel(value: string): string;
export declare function pathToKey(path: JsonPointerPath): string;
//# sourceMappingURL=resolution.d.ts.map