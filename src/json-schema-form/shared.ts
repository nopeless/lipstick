import type { TemplateResult } from "lit";
import type { JsonPointerPath, JsonSchema202012, JsonValue } from "../lib/types.js";
import type { ValidationSnapshot } from "../lib/validation.js";

export interface FieldRenderOptions {
  label?: string;
  required: boolean;
  present: boolean;
  framed?: boolean;
  collapsible?: boolean;
  headerPrefix?: TemplateResult;
  inlineActions?: TemplateResult;
  onAdd?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  removeDisabled?: boolean;
  deferValidationMessage?: boolean;
}

export interface JsonSchemaFormContext extends EventTarget {
  id?: string;
  schema?: JsonSchema202012;
  value?: JsonValue;
  name?: string;
  disabled: boolean;
  readonly: boolean;
  branchSelections: Map<string, number>;
  additionalPropertyDrafts: Map<string, string>;
  collapsedSections: Set<string>;
  pendingFocusId?: string;
  rootSchema: JsonSchema202012;
  formDisabled: boolean;
  validation: ValidationSnapshot;
  dispatchEvent(event: Event): boolean;
}

export type { JsonPointerPath, JsonSchema202012, JsonValue };
