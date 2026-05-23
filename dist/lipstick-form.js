var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { renderForm } from "./form/render.js";
import { emitValue } from "./form/state.js";
import { validateValueAgainstSchema } from "./validation.js";
import { jsonValueEquals, repairValueForSchema } from "./schema.js";
import { config } from "./config.js";
export class LipstickFormElement extends LitElement {
    constructor() {
        super(...arguments);
        this.name = "";
        this.repair = false;
        this.disabled = false;
        this.readonly = false;
        this.persist = false;
        this.branchSelections = new Map();
        this.collapsedSections = new Set();
        this.validation = {
            valid: true,
            issues: [],
            fieldMessages: new Map(),
        };
        this.isApplyingFormUpdate = false;
        this.isBeforeUnloadRegistered = false;
        this.beforeUnloadHandler = () => {
            if (!this.persist) {
                return;
            }
            this.persistValueToStorage();
        };
    }
    createRenderRoot() {
        return this;
    }
    get rootSchema() {
        if (!isSchemaValue(this.schema)) {
            throw new Error("Cannot render without a schema.");
        }
        return this.schema;
    }
    get formDisabled() {
        return this.disabled || this.readonly;
    }
    get value() {
        return this._value;
    }
    set value(next) {
        const previous = this._value;
        const repaired = this.repair && isSchemaValue(this.schema) ? repairValueForSchema(this.schema, next) : next;
        this._value = repaired;
        this.requestUpdate("value", previous);
        if (this.repair &&
            isSchemaValue(this.schema) &&
            next !== undefined &&
            repaired !== undefined &&
            !this.isApplyingFormUpdate &&
            !jsonValueEquals(next, repaired)) {
            emitValue(this, "input", [], repaired, this.schema);
        }
    }
    render() {
        if (isSchemaValue(this.schema)) {
            this.validation = validateValueAgainstSchema(this.schema, this.value);
        }
        else {
            this.validation = {
                valid: true,
                issues: [],
                fieldMessages: new Map(),
            };
        }
        return renderForm(this);
    }
    connectedCallback() {
        super.connectedCallback();
        if (this.persist) {
            this.loadPersistedValue();
            this.registerBeforeUnload();
        }
    }
    disconnectedCallback() {
        if (this.persist) {
            this.persistValueToStorage();
        }
        this.unregisterBeforeUnload();
        super.disconnectedCallback();
    }
    updated() {
        if (!this.pendingFocusId) {
            return;
        }
        const targetId = this.pendingFocusId;
        this.pendingFocusId = undefined;
        this.querySelector(`#${targetId}`)?.focus();
    }
    applyFormValueUpdate(type, path, nextValue, schema) {
        this.isApplyingFormUpdate = true;
        this.value = nextValue;
        this.isApplyingFormUpdate = false;
        const emittedValue = this.value ?? null;
        if (type === "input" || type === "both") {
            emitValue(this, "input", path, emittedValue, schema);
        }
        if (type === "change" || type === "both") {
            emitValue(this, "change", path, emittedValue, schema);
        }
    }
    getPersistStorageKey() {
        const formId = this.id?.trim();
        const schemaTitle = isSchemaValue(this.schema) ? this.schema.title?.trim() : undefined;
        const source = formId || schemaTitle;
        if (!source) {
            console.error("[lipstick] persist requires either a form id or schema.title to derive a storage key.");
            return undefined;
        }
        return `${config.prefix}${source}`;
    }
    loadPersistedValue() {
        const storageKey = this.getPersistStorageKey();
        if (!storageKey) {
            return;
        }
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw !== null) {
                const hydrated = JSON.parse(raw);
                this.value = hydrated;
                if (isSchemaValue(this.schema)) {
                    emitValue(this, "input", [], hydrated, this.schema);
                }
            }
        }
        catch {
            // Ignore storage and parse failures.
        }
    }
    persistValueToStorage() {
        const storageKey = this.getPersistStorageKey();
        if (!storageKey) {
            return;
        }
        try {
            if (this.value === undefined) {
                localStorage.removeItem(storageKey);
            }
            else {
                localStorage.setItem(storageKey, JSON.stringify(this.value));
            }
        }
        catch {
            // Ignore storage write failures.
        }
    }
    registerBeforeUnload() {
        if (this.isBeforeUnloadRegistered) {
            return;
        }
        window.addEventListener("beforeunload", this.beforeUnloadHandler);
        this.isBeforeUnloadRegistered = true;
    }
    unregisterBeforeUnload() {
        if (!this.isBeforeUnloadRegistered) {
            return;
        }
        window.removeEventListener("beforeunload", this.beforeUnloadHandler);
        this.isBeforeUnloadRegistered = false;
    }
}
__decorate([
    property({ attribute: false })
], LipstickFormElement.prototype, "schema", void 0);
__decorate([
    property({ reflect: true })
], LipstickFormElement.prototype, "name", void 0);
__decorate([
    property({ type: Boolean })
], LipstickFormElement.prototype, "repair", void 0);
__decorate([
    property({ attribute: false })
], LipstickFormElement.prototype, "_value", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], LipstickFormElement.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], LipstickFormElement.prototype, "readonly", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], LipstickFormElement.prototype, "persist", void 0);
__decorate([
    state()
], LipstickFormElement.prototype, "branchSelections", void 0);
__decorate([
    state()
], LipstickFormElement.prototype, "collapsedSections", void 0);
function isSchemaValue(value) {
    return typeof value === "object" && value !== null;
}
