import { JsonSchemaFormElement } from "./json-schema-form.js";

if (!customElements.get("lipstick-form")) {
  customElements.define("lipstick-form", JsonSchemaFormElement);
}

export * from "./json-schema-form.js";
export * from "./lib/validation.js";
export type * from "./lib/types.js";
