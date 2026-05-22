import type { JsonSchema, JsonValue } from "../types.js";
export interface SchemaEvaluationIssue {
    keyword: string;
    instancePath: string;
    message: string;
}
export interface EvaluationOptions {
    collectAll?: boolean;
}
export declare function isValueValidAgainstSchema(schema: JsonSchema, value: JsonValue | undefined, root: JsonSchema): boolean;
export declare function evaluateSchema(schema: JsonSchema, value: JsonValue | undefined, root: JsonSchema, options?: EvaluationOptions): {
    valid: boolean;
    issues: SchemaEvaluationIssue[];
};
//# sourceMappingURL=evaluate.d.ts.map