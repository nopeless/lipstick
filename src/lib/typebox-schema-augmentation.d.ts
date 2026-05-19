import type { JsonPrimitive, JsonValue } from "./types.js";

declare module "typebox/type" {
  interface TSchema {
    $schema?: string;
    $id?: string;
    $ref?: string;
    $defs?: Record<string, TSchema>;
    type?: string | string[];
    enum?: JsonPrimitive[];
    const?: JsonPrimitive;
    default?: JsonValue;
    examples?: JsonValue[];
    title?: string;
    description?: string;
    deprecated?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    format?: string;
    properties?: Record<string, TSchema>;
    patternProperties?: Record<string, TSchema>;
    required?: string[];
    additionalProperties?: boolean | TSchema;
    prefixItems?: TSchema[];
    items?: boolean | TSchema;
    minItems?: number;
    maxItems?: number;
    contains?: TSchema;
    oneOf?: TSchema[];
    anyOf?: TSchema[];
    allOf?: TSchema[];
    if?: TSchema;
    then?: TSchema;
    else?: TSchema;
    dependentSchemas?: Record<string, TSchema>;
    dependentRequired?: Record<string, string[]>;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    minLength?: number;
    maxLength?: number;
    [key: string]: unknown;
  }
}
