import type { JsonPointerPath, JsonValue } from "./types.js";
export declare function cloneJsonValue<T extends JsonValue>(value: T): T;
export declare function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue>;
export declare function getValueAtPath(value: JsonValue | undefined, path: JsonPointerPath): JsonValue | undefined;
export declare function setValueAtPath(current: JsonValue | undefined, path: JsonPointerPath, nextValue: JsonValue): JsonValue;
export declare function deleteValueAtPath(current: JsonValue | undefined, path: JsonPointerPath): JsonValue;
export declare function moveArrayItem(current: JsonValue | undefined, path: JsonPointerPath, fromIndex: number, toIndex: number): JsonValue;
//# sourceMappingURL=value.d.ts.map