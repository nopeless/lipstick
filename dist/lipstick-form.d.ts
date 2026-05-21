import { LitElement } from "lit";
import type { JsonSchemaFormContext } from "./json-schema-form/shared.js";
import type { TSchema, JsonValue } from "./lib/types.js";
import { type ValidationSnapshot } from "./lib/validation.js";
export declare class LipstickFormElement extends LitElement implements JsonSchemaFormContext {
    schema?: TSchema;
    repair: boolean;
    _value?: JsonValue;
    disabled: boolean;
    readonly: boolean;
    persist: boolean;
    branchSelections: Map<string, number>;
    additionalPropertyDrafts: Map<string, string>;
    collapsedSections: Set<string>;
    pendingFocusId?: string;
    validation: ValidationSnapshot;
    private isBeforeUnloadRegistered;
    private beforeUnloadHandler;
    protected createRenderRoot(): HTMLElement | DocumentFragment;
    get rootSchema(): TSchema;
    get formDisabled(): boolean;
    get value(): JsonValue | undefined;
    set value(next: JsonValue | undefined);
    render(): typeof import("lit").nothing | import("lit").TemplateResult<1>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected updated(): void;
    applyFormValueUpdate(type: "input" | "change" | "both", path: Array<string | number>, nextValue: JsonValue, schema: TSchema): void;
    private getPersistStorageKey;
    private loadPersistedValue;
    private persistValueToStorage;
    private registerBeforeUnload;
    private unregisterBeforeUnload;
}
declare global {
    interface HTMLElementTagNameMap {
        "lipstick-form": LipstickFormElement;
    }
}
//# sourceMappingURL=lipstick-form.d.ts.map