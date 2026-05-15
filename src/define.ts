import { JsonSchemaFormElement } from './json-schema-form.js'

if (!customElements.get('lipstick-form')) {
  customElements.define('lipstick-form', JsonSchemaFormElement)
}

export { JsonSchemaFormElement } from './json-schema-form.js'
export type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonSchemaFormEventDetail,
  JsonValue,
} from './lib/types.js'
