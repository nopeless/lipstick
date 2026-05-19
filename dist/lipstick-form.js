var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { renderForm } from "./json-schema-form/render.js";
import { validateValueAgainstSchema } from "./lib/validation.js";
export class LipstickFormElement extends LitElement {
    constructor() {
        super(...arguments);
        this.disabled = false;
        this.readonly = false;
        this.branchSelections = new Map();
        this.additionalPropertyDrafts = new Map();
        this.collapsedSections = new Set();
        this.validation = {
            valid: true,
            issues: [],
            fieldMessages: new Map(),
        };
    }
    createRenderRoot() {
        return this;
    }
    get rootSchema() {
        if (!this.schema) {
            throw new Error("Cannot render without a schema.");
        }
        return this.schema;
    }
    get formDisabled() {
        return this.disabled || this.readonly;
    }
    render() {
        if (this.schema) {
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
    updated() {
        if (!this.pendingFocusId) {
            return;
        }
        const targetId = this.pendingFocusId;
        this.pendingFocusId = undefined;
        this.querySelector(`#${targetId}`)?.focus();
    }
}
__decorate([
    property({ attribute: false })
], LipstickFormElement.prototype, "schema", void 0);
__decorate([
    property({ attribute: false })
], LipstickFormElement.prototype, "value", void 0);
__decorate([
    property()
], LipstickFormElement.prototype, "name", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], LipstickFormElement.prototype, "disabled", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], LipstickFormElement.prototype, "readonly", void 0);
__decorate([
    state()
], LipstickFormElement.prototype, "branchSelections", void 0);
__decorate([
    state()
], LipstickFormElement.prototype, "additionalPropertyDrafts", void 0);
__decorate([
    state()
], LipstickFormElement.prototype, "collapsedSections", void 0);
