import type { TSchema } from "typebox/type";
export type { TSchema } from "typebox/type";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonPointerPath = Array<string | number>;

export interface JsonSchemaFormEventDetail {
  value: JsonValue;
  path: JsonPointerPath;
  schema: TSchema;
}

