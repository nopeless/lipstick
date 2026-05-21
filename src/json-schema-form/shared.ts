import type { TemplateResult } from "lit";
import type { JsonPointerPath, TSchema, JsonValue } from "../lib/types.js";
import type { ValidationSnapshot } from "../lib/validation.js";

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
  schema?: TSchema;
  value?: JsonValue;
  disabled: boolean;
  readonly: boolean;
  branchSelections: Map<string, number>;
  additionalPropertyDrafts: Map<string, string>;
  collapsedSections: Set<string>;
  pendingFocusId?: string;
  rootSchema: TSchema;
  formDisabled: boolean;
  validation: ValidationSnapshot;
  dispatchEvent(event: Event): boolean;
}

export type { JsonPointerPath, TSchema, JsonValue };

