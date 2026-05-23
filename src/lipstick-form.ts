import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { renderForm } from "./form/render.js";
import { emitValue } from "./form/state.js";
import type { JsonSchemaFormContext } from "./form/context.js";
import type { JsonSchema, JsonValue } from "./types.js";
import { validateValueAgainstSchema, type ValidationSnapshot } from "./validation.js";
import { jsonValueEquals, repairValueForSchema } from "./schema.js";
import { config } from "./config.js";

export class LipstickFormElement extends LitElement implements JsonSchemaFormContext {
  @property({ attribute: false })
  schema?: JsonSchema;

  @property({ reflect: true })
  name = "";

  @property({ type: Boolean })
  repair = false;

  @property({ attribute: false })
  _value?: JsonValue;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  persist = false;

  @state()
  branchSelections = new Map<string, number>();

  @state()
  collapsedSections = new Set<string>();

  pendingFocusId?: string;
  validation: ValidationSnapshot = {
    valid: true,
    issues: [],
    fieldMessages: new Map<string, string[]>(),
  };
  private isApplyingFormUpdate = false;
  private isBeforeUnloadRegistered = false;
  private beforeUnloadHandler = () => {
    if (!this.persist) {
      return;
    }
    this.persistValueToStorage();
  };

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  get rootSchema(): JsonSchema {
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
    const repaired =
      this.repair && this.schema ? repairValueForSchema(this.schema, next) : next;
    this._value = repaired;
    this.requestUpdate("value", previous);

    if (
      this.repair &&
      this.schema &&
      next !== undefined &&
      repaired !== undefined &&
      !this.isApplyingFormUpdate &&
      !jsonValueEquals(next, repaired)
    ) {
      emitValue(this, "input", [], repaired, this.schema);
    }
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

  connectedCallback(): void {
    super.connectedCallback();
    if (this.persist) {
      this.loadPersistedValue();
      this.registerBeforeUnload();
    }
  }

  disconnectedCallback(): void {
    if (this.persist) {
      this.persistValueToStorage();
    }
    this.unregisterBeforeUnload();
    super.disconnectedCallback();
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

  applyFormValueUpdate(
    type: "input" | "change" | "both",
    path: Array<string | number>,
    nextValue: JsonValue,
    schema: JsonSchema,
  ): void {
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

  private getPersistStorageKey(): string | undefined {
    const formId = this.id?.trim();
    const schemaTitle = this.schema?.title?.trim();
    const source = formId || schemaTitle;
    if (!source) {
      console.error(
        "[lipstick] persist requires either a form id or schema.title to derive a storage key.",
      );
      return undefined;
    }
    return `${config.prefix}${source}`;
  }

  private loadPersistedValue(): void {
    const storageKey = this.getPersistStorageKey();
    if (!storageKey) {
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const hydrated = JSON.parse(raw) as JsonValue;
        this.value = hydrated;
        if (this.schema) {
          emitValue(this, "input", [], hydrated, this.schema);
        }
      }
    } catch {
      // Ignore storage and parse failures.
    }
  }

  private persistValueToStorage(): void {
    const storageKey = this.getPersistStorageKey();
    if (!storageKey) {
      return;
    }

    try {
      if (this.value === undefined) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(this.value));
      }
    } catch {
      // Ignore storage write failures.
    }
  }

  private registerBeforeUnload(): void {
    if (this.isBeforeUnloadRegistered) {
      return;
    }
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
    this.isBeforeUnloadRegistered = true;
  }

  private unregisterBeforeUnload(): void {
    if (!this.isBeforeUnloadRegistered) {
      return;
    }
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    this.isBeforeUnloadRegistered = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lipstick-form": LipstickFormElement;
  }
}

