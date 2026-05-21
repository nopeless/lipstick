import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { renderForm } from "./json-schema-form/render.js";
import type { JsonSchemaFormContext } from "./json-schema-form/shared.js";
import type { TSchema, JsonValue } from "./lib/types.js";
import { validateValueAgainstSchema, type ValidationSnapshot } from "./lib/validation.js";
import { Value } from "typebox/value";

export class LipstickFormElement extends LitElement implements JsonSchemaFormContext {
  @property({ attribute: false })
  schema?: TSchema;

  @property({ type: Boolean })
  repair = false;

  @property({ attribute: false })
  _value?: JsonValue;

  @property()
  name?: string;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  branchSelections = new Map<string, number>();

  @state()
  additionalPropertyDrafts = new Map<string, string>();

  @state()
  collapsedSections = new Set<string>();

  pendingFocusId?: string;
  validation: ValidationSnapshot = {
    valid: true,
    issues: [],
    fieldMessages: new Map<string, string[]>(),
  };

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  get rootSchema(): TSchema {
    if (!this.schema) {
      throw new Error("Cannot render without a schema.");
    }

    return this.schema;
  }

  get formDisabled(): boolean {
    return this.disabled || this.readonly;
  }

  get value(): JsonValue | undefined {
    return this._value;
  }

  set value(next: JsonValue | undefined) {
    const previous = this._value;
    this._value = this.repair && this.schema ? (Value.Repair(this.schema, next) as JsonValue) : next;
    this.requestUpdate("value", previous);
  }

  render() {
    if (this.schema) {
      this.validation = validateValueAgainstSchema(this.schema, this.value);
    } else {
      this.validation = {
        valid: true,
        issues: [],
        fieldMessages: new Map<string, string[]>(),
      };
    }

    return renderForm(this);
  }

  protected updated() {
    if (!this.pendingFocusId) {
      return;
    }

    const targetId = this.pendingFocusId;
    this.pendingFocusId = undefined;
    this.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `#${targetId}`,
    )?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lipstick-form": LipstickFormElement;
  }
}
