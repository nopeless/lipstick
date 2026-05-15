import { LitElement } from 'lit'
import { property, state } from 'lit/decorators.js'
import { renderForm } from './json-schema-form/render.js'
import type { JsonSchemaFormContext } from './json-schema-form/shared.js'
import type { JsonSchema202012, JsonValue } from './lib/types.js'

export class JsonSchemaFormElement extends LitElement implements JsonSchemaFormContext {
  @property({ attribute: false })
  schema?: JsonSchema202012

  @property({ attribute: false })
  value?: JsonValue

  @property()
  name?: string

  @property({ type: Boolean, reflect: true })
  disabled = false

  @property({ type: Boolean, reflect: true })
  readonly = false

  @state()
  branchSelections = new Map<string, number>()

  @state()
  additionalPropertyDrafts = new Map<string, string>()

  @state()
  collapsedSections = new Set<string>()

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  get rootSchema(): JsonSchema202012 {
    if (!this.schema) {
      throw new Error('Cannot render without a schema.')
    }

    return this.schema
  }

  get formDisabled(): boolean {
    return this.disabled || this.readonly
  }

  render() {
    return renderForm(this)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lipstick-form': JsonSchemaFormElement
  }
}
