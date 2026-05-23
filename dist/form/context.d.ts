import type { TemplateResult } from "lit";
import type { JsonPointerPath, JsonSchema, JsonValue } from "../types.js";
import type { ValidationSnapshot } from "../validation.js";
export interface FieldRenderOptions {
    label?: string;
    required: boolean;
    present: boolean;
    framed?: boolean;
    collapsible?: boolean;
    headerSuffix?: TemplateResult;
    inlineActions?: TemplateResult;
    onAdd?: () => void;
    onRemove?: () => void;
    removeLabel?: string;
    removeDisabled?: boolean;
    deferValidationMessage?: boolean;
}
export interface JsonSchemaFormContext extends EventTarget {
    id?: string;
    name?: string;
    schema?: unknown;
    value?: JsonValue;
    repair: boolean;
    disabled: boolean;
    readonly: boolean;
    branchSelections: Map<string, number>;
    collapsedSections: Set<string>;
    pendingFocusId?: string;
    rootSchema: JsonSchema;
    formDisabled: boolean;
    validation: ValidationSnapshot;
    applyFormValueUpdate(type: "input" | "change" | "both", path: JsonPointerPath, nextValue: JsonValue, schema: JsonSchema): void;
    dispatchEvent(event: Event): boolean;
}
export type { JsonPointerPath, JsonSchema, JsonValue };
//# sourceMappingURL=context.d.ts.map