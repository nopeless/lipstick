export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export type JsonPointerPath = Array<string | number>;
export interface JsonSchema202012 {
    $schema?: string;
    $id?: string;
    $ref?: string;
    $defs?: Record<string, JsonSchema202012>;
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
    properties?: Record<string, JsonSchema202012>;
    patternProperties?: Record<string, JsonSchema202012>;
    required?: string[];
    additionalProperties?: boolean | JsonSchema202012;
    prefixItems?: JsonSchema202012[];
    items?: boolean | JsonSchema202012;
    minItems?: number;
    maxItems?: number;
    contains?: JsonSchema202012;
    oneOf?: JsonSchema202012[];
    anyOf?: JsonSchema202012[];
    allOf?: JsonSchema202012[];
    if?: JsonSchema202012;
    then?: JsonSchema202012;
    else?: JsonSchema202012;
    dependentSchemas?: Record<string, JsonSchema202012>;
    dependentRequired?: Record<string, string[]>;
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
    minLength?: number;
    maxLength?: number;
    [key: string]: unknown;
}
export interface JsonSchemaFormEventDetail {
    value: JsonValue;
    path: JsonPointerPath;
    schema: JsonSchema202012;
}
//# sourceMappingURL=types.d.ts.map