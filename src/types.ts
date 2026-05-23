export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonPointerPath = Array<string | number>;

export type JsonSchemaTypeName =
  | "null"
  | "boolean"
  | "object"
  | "array"
  | "number"
  | "integer"
  | "string";

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $defs?: Record<string, JsonSchema>;
  $comment?: string;
  $ref?: string;
  type?: JsonSchemaTypeName | JsonSchemaTypeName[];
  enum?: JsonValue[];
  const?: JsonValue;
  default?: JsonValue;
  examples?: JsonValue[];
  title?: string;
  description?: string;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  format?: string;
  properties?: Record<string, JsonSchema>;
  patternProperties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  prefixItems?: JsonSchema[];
  items?: boolean | JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  dependentSchemas?: Record<string, JsonSchema>;
  dependentRequired?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface JsonSchemaFormEventDetail {
  value: JsonValue;
  path: JsonPointerPath;
  schema: JsonSchema;
}

