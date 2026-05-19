import type { JsonPointerPath, JsonSchema202012, JsonValue } from "../types.js";
export * from "./internal.js";
export declare function resolveSchema(schema: JsonSchema202012, root: JsonSchema202012, value: JsonValue | undefined): JsonSchema202012;
export declare function getRequiredProperties(schema: JsonSchema202012, value: JsonValue | undefined): Set<string>;
export declare function matchesSchema(value: JsonValue | undefined, schema: JsonSchema202012, root: JsonSchema202012): boolean;
export declare function getArrayItemSchema(schema: JsonSchema202012, index: number): JsonSchema202012 | undefined;
export declare function isObjectSchema(schema: JsonSchema202012): boolean;
export declare function isArraySchema(schema: JsonSchema202012): boolean;
export declare function acceptsType(schema: JsonSchema202012, expected: string): boolean;
export declare function humanizeLabel(value: string): string;
export declare function pathToKey(path: JsonPointerPath): string;
//# sourceMappingURL=resolution.d.ts.map