import { JsonSchemaFormElement } from './json-schema-form.js'

if (!customElements.get('json-schema-form')) {
  customElements.define('json-schema-form', JsonSchemaFormElement)
}

export { JsonSchemaFormElement } from './json-schema-form.js'
export type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonSchemaFormEventDetail,
  JsonValue,
} from './lib/types.js'
