import { LitElement } from "lit";
import type { JsonSchemaFormContext } from "./json-schema-form/shared.js";
import type { TSchema, JsonValue } from "./lib/types.js";
import { type ValidationSnapshot } from "./lib/validation.js";
export declare class LipstickFormElement extends LitElement implements JsonSchemaFormContext {
    schema?: TSchema;
    value?: JsonValue;
    name?: string;
    disabled: boolean;
    readonly: boolean;
    branchSelections: Map<string, number>;
    additionalPropertyDrafts: Map<string, string>;
    collapsedSections: Set<string>;
    pendingFocusId?: string;
    validation: ValidationSnapshot;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    get rootSchema(): TSchema;
    get formDisabled(): boolean;
    render(): typeof import("lit").nothing | import("lit").TemplateResult<1>;
    protected updated(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "lipstick-form": LipstickFormElement;
    }
}
//# sourceMappingURL=lipstick-form.d.ts.map