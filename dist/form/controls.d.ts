import { type TemplateResult } from "lit";
import type { JsonPointerPath, JsonSchema, JsonValue } from "../types.js";
import type { JsonSchemaFormContext } from "./context.js";
export interface ScalarControlOptions {
    inputId: string;
    disabled: boolean;
    required: boolean;
    invalid: boolean;
    describedBy?: string;
}
export declare function renderScalarControl(ctx: JsonSchemaFormContext, schema: JsonSchema, value: JsonValue | undefined, path: JsonPointerPath, options: ScalarControlOptions): TemplateResult;
export declare function getLocalNumericParseError(inputId: string): string | undefined;
//# sourceMappingURL=controls.d.ts.map