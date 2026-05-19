import type { JsonSchema202012, JsonValue } from "./types.js";
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
export declare const DRAFT_2020_12_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";
export declare function validateValueAgainstSchema(schema: JsonSchema202012, value: JsonValue | undefined): ValidationSnapshot;
export declare function getFieldMessagesForSchema(schema: JsonSchema202012, value: JsonValue | undefined): Map<string, string[]>;
//# sourceMappingURL=validation.d.ts.map