import { JsonSchemaFormElement } from "./json-schema-form.js";

if (!customElements.get("lip-stick")) {
  customElements.define("lip-stick", JsonSchemaFormElement);
}

export * from "./json-schema-form.js";
export * from "./lib/validation.js";
export type * from "./lib/types.js";
