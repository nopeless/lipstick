import type { TSchema, JsonValue } from "./types.js";
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
export declare function validateValueAgainstSchema(schema: TSchema, value: JsonValue | undefined): ValidationSnapshot;
export declare function getFieldMessagesForSchema(schema: TSchema, value: JsonValue | undefined): Map<string, string[]>;
//# sourceMappingURL=validation.d.ts.map