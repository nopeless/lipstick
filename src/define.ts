import { LipstickFormElement } from "./lipstick-form.js";
import { defineConfigLipstick } from "./config.js";
import { validateValueAgainstSchema } from "./validation.js";
import type {
  JsonPrimitive,
  JsonValue,
  JsonPointerPath,
  JsonSchemaTypeName,
  JsonSchema,
  JsonSchemaFormEventDetail,
} from "./types.js";
import type { ValidationIssue, ValidationSnapshot } from "./validation.js";

if (!customElements.get("lipstick-form")) {
  customElements.define("lipstick-form", LipstickFormElement);
}

export { LipstickFormElement, defineConfigLipstick, validateValueAgainstSchema };
export type {
  JsonPrimitive,
  JsonValue,
  JsonPointerPath,
  JsonSchemaTypeName,
  JsonSchema,
  JsonSchemaFormEventDetail,
  ValidationIssue,
  ValidationSnapshot,
};

