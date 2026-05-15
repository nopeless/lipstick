import { JsonSchemaFormElement } from "./json-schema-form.js";

if (!customElements.get("lip-stick")) {
  customElements.define("lip-stick", JsonSchemaFormElement);
}

export { JsonSchemaFormElement } from "./json-schema-form.js";
export type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonSchemaFormEventDetail,
  JsonValue,
} from "./lib/types.js";
