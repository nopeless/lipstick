import type { JsonSchema, JsonValue } from "./types.js";
export interface ValidationIssue {
    keyword: string;
    instancePath: string;
    message: string;
}
export interface ValidationSnapshot {
    valid: boolean;
    issues: ValidationIssue[];
    fieldMessages: Map<string, string[]>;
    schemaError?: string;
}
export declare function validateValueAgainstSchema(schema: JsonSchema, value: JsonValue | undefined): ValidationSnapshot;
export declare function getFieldMessagesForSchema(schema: JsonSchema, value: JsonValue | undefined): Map<string, string[]>;
//# sourceMappingURL=validation.d.ts.map