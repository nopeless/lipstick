import { LitElement, html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import {
  acceptsType,
  buildInitialValue,
  describeUnion,
  getArrayItemSchema,
  getRefError,
  getRequiredProperties,
  humanizeLabel,
  isArraySchema,
  isObjectSchema,
  pathToKey,
  resolveSchema,
  sanitizeValueForSchema,
  type UnionPresentation,
} from './lib/schema.js'
import {
  formatNumericValue,
  getNumericInputStep,
  getStringInputType,
  parseNumericInputValue,
} from './lib/input.js'
import type {
  JsonPointerPath,
  JsonPrimitive,
  JsonSchema202012,
  JsonSchemaFormEventDetail,
  JsonValue,
} from './lib/types.js'
import {
  cloneJsonValue,
  deleteValueAtPath,
  getValueAtPath,
  isJsonObject,
  moveArrayItem,
  setValueAtPath,
} from './lib/value.js'

interface FieldRenderOptions {
  label?: string
  required: boolean
  present: boolean
  framed?: boolean
  collapsible?: boolean
  headerPrefix?: TemplateResult
  onAdd?: () => void
  onRemove?: () => void
}

export class JsonSchemaFormElement extends LitElement {
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
  private branchSelections = new Map<string, number>()

  @state()
  private additionalPropertyDrafts = new Map<string, string>()

  @state()
  private collapsedSections = new Set<string>()

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  private get rootSchema(): JsonSchema202012 {
    if (!this.schema) {
      throw new Error('Cannot render without a schema.')
    }

    return this.schema
  }

  private get formDisabled(): boolean {
    return this.disabled || this.readonly
  }

  render() {
    if (!this.schema) {
      return nothing
    }

    const rootSchema = this.rootSchema
    const schema = resolveSchema(rootSchema, rootSchema, this.value)
    const serializedValue = JSON.stringify(this.value ?? null)

    return html`
      <div class="ls-form" data-disabled=${String(this.disabled)}>
        ${this.renderNode(schema, this.value, [], {
          required: true,
          present: true,
          framed: true,
          collapsible: false,
        })}
        ${this.name
          ? html`<input type="hidden" name=${this.name} .value=${serializedValue} />`
          : nothing}
      </div>
    `
  }

  private renderNode(
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    const rootSchema = this.rootSchema
    const resolved = resolveSchema(schema, rootSchema, value)
    const union = describeUnion(
      resolved,
      value,
      rootSchema,
      this.branchSelections.get(pathToKey(path)),
    )

    if (!options.present && !options.required) {
      return this.renderCollapsedOptionalField(resolved, path, options)
    }

    if (union) {
      return this.renderUnionField(resolved, value, path, options, union)
    }

    if (resolved.const !== undefined || resolved.enum?.length) {
      return this.renderScalarField(resolved, value, path, options)
    }

    if (isObjectSchema(resolved)) {
      return this.renderObjectField(resolved, value, path, options)
    }

    if (isArraySchema(resolved)) {
      return this.renderArrayField(resolved, value, path, options)
    }

    return this.renderScalarField(resolved, value, path, options)
  }

  private renderCollapsedOptionalField(
    schema: JsonSchema202012,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    const label = options.label ?? schema.title ?? 'Field'
    const collapsedOptions = { ...options, collapsible: false }

    return html`
      <div class="ls-leaf ls-leaf--collapsed">
        ${this.renderLeafHeader(label, collapsedOptions, path)}
      </div>
    `
  }

  private renderUnionField(
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
    union: UnionPresentation,
  ): TemplateResult {
    const rootSchema = this.rootSchema
    const branches = schema.oneOf ?? schema.anyOf ?? []
    const branchSchema = resolveSchema(
      branches[union.selectedIndex],
      rootSchema,
      value,
    )
    const pathKey = pathToKey(path)
    const collapsed = this.isCollapsed(path)

    const changeBranch = (index: number) => {
      this.branchSelections = new Map(this.branchSelections).set(pathKey, index)
      const nextValue = sanitizeValueForSchema(value, branches[index], rootSchema)
      this.commitRootValue(path, nextValue, branches[index])
    }

    return html`
      <fieldset
        class=${this.getFieldClassNames(
          'ls-union',
          this.shouldFrameContainer(schema, options),
        )}
      >
        ${this.renderFieldsetHeader(schema, options, path, collapsed)}
        ${collapsed
          ? nothing
          : html`
              ${this.renderDescription(schema)}
              ${this.renderRefWarning(schema)}
              ${this.renderUnionSelector(union, changeBranch)}
              <div class="ls-union-body">
                ${this.renderUnionBranch(branchSchema, value, path, union)}
              </div>
            `}
      </fieldset>
    `
  }

  private renderUnionBranch(
    branchSchema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    union: UnionPresentation,
  ): TemplateResult {
    const schema =
      union.discriminator && isObjectSchema(branchSchema)
        ? this.omitObjectProperty(branchSchema, union.discriminator.property)
        : branchSchema

    return this.renderNode(schema, value, path, {
      required: true,
      present: true,
      framed: false,
      collapsible: false,
    })
  }

  private renderUnionSelector(
    union: UnionPresentation,
    changeBranch: (index: number) => void,
  ): TemplateResult {
    if (union.kind === 'discriminator' && union.discriminator) {
      return html`
        <label class="ls-inline-field">
          <span>${humanizeLabel(union.discriminator.property)}</span>
          <select
            .disabled=${this.formDisabled}
            .value=${String(union.selectedIndex)}
            @change=${(event: Event) =>
              changeBranch(Number((event.target as HTMLSelectElement).value))}
          >
            ${union.discriminator.options.map(
              (option) => html`
                <option value=${String(option.index)}>
                  ${String(option.value)}
                </option>
              `,
            )}
          </select>
        </label>
      `
    }

    if (union.kind === 'generic') {
      return html`
        <label class="ls-inline-field">
          <span>Variant</span>
          <select
            .disabled=${this.formDisabled}
            .value=${String(union.selectedIndex)}
            @change=${(event: Event) =>
              changeBranch(Number((event.target as HTMLSelectElement).value))}
          >
            ${union.options.map(
              (option) => html`
                <option value=${String(option.index)}>${option.label}</option>
              `,
            )}
          </select>
        </label>
      `
    }

    return html`
      <div class="ls-choice-group" role="radiogroup">
        ${union.options.map(
          (option) => html`
            <button
              type="button"
              class=${option.index === union.selectedIndex ? 'is-selected' : ''}
              ?disabled=${this.formDisabled}
              @click=${() => changeBranch(option.index)}
            >
              ${option.literal ?? option.label}
            </button>
          `,
        )}
      </div>
    `
  }

  private renderObjectField(
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    const objectValue = isJsonObject(value) ? value : {}
    const properties = schema.properties ?? {}
    const requiredSet = getRequiredProperties(schema, objectValue)
    const propertyEntries = Object.entries(properties)
    const additionalKeys = Object.keys(objectValue).filter(
      (key) => !(key in properties),
    )
    const body = this.renderObjectBody(
      schema,
      objectValue,
      path,
      propertyEntries,
      requiredSet,
      additionalKeys,
    )

    if (options.framed === false) {
      return html`<div class="ls-object-embed">${body}</div>`
    }

    const collapsed = this.isCollapsed(path)

    return html`
      <fieldset
        class=${this.getFieldClassNames(
          'ls-object',
          this.shouldFrameContainer(schema, options),
        )}
      >
        ${this.renderFieldsetHeader(schema, options, path, collapsed)}
        ${collapsed
          ? nothing
          : html`
              ${this.renderDescription(schema)}
              ${this.renderRefWarning(schema)}
              ${body}
            `}
      </fieldset>
    `
  }

  private renderObjectBody(
    schema: JsonSchema202012,
    objectValue: Record<string, JsonValue>,
    path: JsonPointerPath,
    propertyEntries: Array<[string, JsonSchema202012]>,
    requiredSet: Set<string>,
    additionalKeys: string[],
  ): TemplateResult {
    return html`
      <div class="ls-object-body">
        ${propertyEntries.map(([key, childSchema]) => {
          const required = requiredSet.has(key)
          const present = required || key in objectValue

          return this.renderObjectProperty(
            key,
            childSchema,
            objectValue[key],
            [...path, key],
            {
              label: childSchema.title ?? humanizeLabel(key),
              required,
              present,
              framed: true,
              collapsible: this.canCollapseSchema(childSchema),
              onAdd: required
                ? undefined
                : () => this.addKnownProperty(path, key, childSchema),
              onRemove: required
                ? undefined
                : () => this.removeProperty([...path, key]),
            },
          )
        })}
        ${additionalKeys.map((key) =>
          this.renderObjectProperty(
            key,
            this.getAdditionalPropertySchema(schema),
            objectValue[key],
            [...path, key],
            {
              label: humanizeLabel(key),
              required: false,
              present: true,
              framed: true,
              collapsible: this.canCollapseSchema(
                this.getAdditionalPropertySchema(schema),
              ),
              onRemove: () => this.removeProperty([...path, key]),
            },
          ),
        )}
      </div>
      ${schema.additionalProperties !== false
        ? this.renderAdditionalPropertyComposer(schema, path)
        : nothing}
    `
  }

  private renderObjectProperty(
    key: string,
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    return html`
      <div class="ls-object-row" data-key=${key}>
        ${this.renderNode(schema, value, path, options)}
      </div>
    `
  }

  private renderAdditionalPropertyComposer(
    schema: JsonSchema202012,
    path: JsonPointerPath,
  ): TemplateResult | typeof nothing {
    const pathKey = pathToKey(path)
    const draft = this.additionalPropertyDrafts.get(pathKey) ?? ''
    const canAdd = this.canAddAdditionalProperty(schema)

    if (!canAdd) {
      return nothing
    }

    return html`
      <div class="ls-additional-composer">
        <button
          type="button"
          class="ls-inline-add-button"
          ?disabled=${this.formDisabled || !canAdd || !draft.trim()}
          @click=${() => this.addAdditionalProperty(path, draft.trim(), schema)}
          aria-label="Add new property"
        >
          <span class="ls-inline-add-symbol">+</span>
        </button>
        <input
          type="text"
          placeholder="add new property"
          .disabled=${this.formDisabled || !canAdd}
          .value=${draft}
          @input=${(event: Event) => {
            const nextValue = (event.target as HTMLInputElement).value
            this.additionalPropertyDrafts = new Map(
              this.additionalPropertyDrafts,
            ).set(pathKey, nextValue)
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'Enter') {
              return
            }

            event.preventDefault()
            this.addAdditionalProperty(path, draft.trim(), schema)
          }}
        />
      </div>
    `
  }

  private renderArrayField(
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    const arrayValue = Array.isArray(value) ? value : []
    const nextIndex = arrayValue.length
    const addSchema = getArrayItemSchema(schema, nextIndex) ?? {}
    const addLabel = addSchema.title
    const canAdd =
      schema.items !== false ||
      nextIndex < (schema.prefixItems?.length ?? 0)
    const body = this.renderArrayBody(
      schema,
      arrayValue,
      path,
      nextIndex,
      addLabel,
      canAdd,
    )

    if (options.framed === false) {
      return html`<div class="ls-array-embed">${body}</div>`
    }

    const collapsed = this.isCollapsed(path)

    return html`
      <fieldset
        class=${this.getFieldClassNames(
          'ls-array',
          this.shouldFrameContainer(schema, options),
        )}
      >
        ${this.renderFieldsetHeader(schema, options, path, collapsed)}
        ${collapsed
          ? nothing
          : html`
              ${this.renderDescription(schema)}
              ${this.renderRefWarning(schema)}
              ${body}
            `}
      </fieldset>
    `
  }

  private renderArrayBody(
    schema: JsonSchema202012,
    arrayValue: JsonValue[],
    path: JsonPointerPath,
    nextIndex: number,
    addLabel: string | undefined,
    canAdd: boolean,
  ): TemplateResult {
    return html`
      <div class="ls-array-items">
        ${arrayValue.map((item, index) =>
          this.renderArrayItem(schema, item, path, index),
        )}
      </div>
      ${canAdd
        ? html`
            <button
              type="button"
              class="ls-array-add-button"
              ?disabled=${this.formDisabled}
              aria-label=${addLabel ? `Add ${addLabel}` : 'Add item'}
              @click=${() => this.addArrayItem(path, schema, nextIndex)}
            >
              +
            </button>
          `
        : nothing}
    `
  }

  private renderArrayItem(
    schema: JsonSchema202012,
    item: JsonValue,
    path: JsonPointerPath,
    index: number,
  ): TemplateResult {
    const itemPath = [...path, index]
    const itemSchema = getArrayItemSchema(schema, index) ?? {}
    const canRemove = index >= (schema.minItems ?? 0)
    const arrayValue = getValueAtPath(this.value, path)
    const canMoveUp = index > 0
    const canMoveDown = Array.isArray(arrayValue) && index < arrayValue.length - 1
    const useSideActions = this.isSimpleArrayItemSchema(itemSchema)
    const useCompactObjectLayout = this.isCompactObjectArrayItemSchema(itemSchema)
    const headerPrefix = useSideActions
      ? undefined
      : this.renderArrayItemReorderActions(path, index, canMoveUp, canMoveDown)

    return html`
      <div
        class=${`ls-array-row${
          useCompactObjectLayout
            ? ' ls-array-row--compact-object'
            : useSideActions
              ? ' ls-array-row--simple-actions'
              : ' ls-array-row--inline-actions'
        }`}
      >
        ${useSideActions
          ? html`
              <div class="ls-array-actions ls-array-actions--side">
                ${this.renderArrayItemRemoveAction(itemPath, canRemove)}
              </div>
            `
          : useCompactObjectLayout
            ? html`
                <div class="ls-array-actions ls-array-actions--compact">
                  ${this.renderArrayItemReorderActions(
                    path,
                    index,
                    canMoveUp,
                    canMoveDown,
                  )}
                  ${this.renderArrayItemRemoveAction(itemPath, canRemove)}
                </div>
              `
          : nothing}
        <div class="ls-array-item-body">
          ${this.renderNode(itemSchema, item, itemPath, {
            label: useCompactObjectLayout ? undefined : itemSchema.title ?? `Item ${index + 1}`,
            required: index < (schema.minItems ?? 0),
            present: true,
            framed: useCompactObjectLayout ? false : true,
            collapsible: useCompactObjectLayout ? false : this.canCollapseSchema(itemSchema),
            onRemove:
              useSideActions || useCompactObjectLayout
                ? undefined
                : () => this.removeArrayItem(itemPath),
            headerPrefix,
          })}
        </div>
        ${useSideActions
          ? html`
              <div class="ls-array-actions ls-array-actions--end">
                ${this.renderArrayItemReorderActions(
                  path,
                  index,
                  canMoveUp,
                  canMoveDown,
                )}
              </div>
            `
          : nothing}
      </div>
    `
  }

  private renderScalarField(
    schema: JsonSchema202012,
    value: JsonValue | undefined,
    path: JsonPointerPath,
    options: FieldRenderOptions,
  ): TemplateResult {
    const fieldLabel = options.label ?? schema.title ?? 'Value'
    const inputId = this.createInputId(path)
    const disabled = this.formDisabled || schema.readOnly === true
    const inlineSimpleValue = !schema.description && !acceptsType(schema, 'boolean')

    if (schema.const !== undefined) {
      const control = html`
        <output class="ls-const-value" id=${inputId}>${String(schema.const)}</output>
      `

      if (inlineSimpleValue) {
        return this.renderInlineSimpleField(
          fieldLabel,
          options,
          inputId,
          schema,
          control,
          true,
        )
      }

      return html`
        <div class="ls-leaf">
          ${this.renderLeafHeader(fieldLabel, options, path)}
          ${this.renderLeafBody(schema)}
          ${control}
        </div>
      `
    }

    if (schema.enum?.length) {
      const optionsList =
        schema.enum ?? []
      const normalizedValue =
        value !== undefined && optionsList.includes(value as never)
          ? String(value)
          : String(optionsList[0] ?? '')
      const control = html`
        <select
          id=${inputId}
          .disabled=${disabled}
          .value=${normalizedValue}
          @change=${(event: Event) => {
            const nextValue = this.parseLiteralOption(
              (event.target as HTMLSelectElement).value,
              optionsList,
            )
            this.updatePathValue(path, nextValue, schema, true)
          }}
        >
          ${optionsList.map(
            (option) => html`
              <option value=${String(option)}>${String(option)}</option>
            `,
          )}
        </select>
      `

      if (inlineSimpleValue) {
        return this.renderInlineSimpleField(
          fieldLabel,
          options,
          inputId,
          schema,
          control,
        )
      }

      return html`
        <div class="ls-leaf">
          ${this.renderLeafHeader(fieldLabel, options, path)}
          ${this.renderLeafBody(schema)}
          ${control}
        </div>
      `
    }

    if (acceptsType(schema, 'boolean')) {
      return html`
        <div class="ls-leaf ls-toggle">
          <div class="ls-toggle-shell">
            <div class="ls-toggle-copy">
              ${this.renderLeafHeader(fieldLabel, options, path)}
              ${this.renderLeafBody(schema)}
            </div>
            <label class="ls-switch" for=${inputId}>
              <input
                id=${inputId}
                type="checkbox"
                .disabled=${disabled}
                .checked=${value === true}
                @change=${(event: Event) =>
                  this.updatePathValue(
                    path,
                    (event.target as HTMLInputElement).checked,
                    schema,
                    true,
                  )}
              />
              <span class="ls-switch-track" aria-hidden="true">
                <span class="ls-switch-thumb"></span>
              </span>
            </label>
          </div>
        </div>
      `
    }

    if (acceptsType(schema, 'integer') || acceptsType(schema, 'number')) {
      const numericValue =
        typeof value === 'number'
          ? value
          : typeof schema.minimum === 'number'
            ? schema.minimum
            : 0
      const step = getNumericInputStep(schema)
      const formattedValue = formatNumericValue(numericValue, step)

      if (
        typeof schema.minimum === 'number' &&
        typeof schema.maximum === 'number'
      ) {
        const control = html`
          <div class="ls-range">
            <div class="ls-range-controls">
              <div class="ls-range-main">
                <input
                  id=${inputId}
                  type="range"
                  .disabled=${disabled}
                  .min=${String(schema.minimum)}
                  .max=${String(schema.maximum)}
                  .step=${String(step)}
                  .value=${String(numericValue)}
                  @input=${(event: Event) =>
                    this.updatePathValue(
                      path,
                      parseNumericInputValue(event.target as HTMLInputElement),
                      schema,
                      false,
                    )}
                  @change=${(event: Event) =>
                    this.updatePathValue(
                      path,
                      parseNumericInputValue(event.target as HTMLInputElement),
                      schema,
                      true,
                    )}
                />
                <div class="ls-range-meta">
                  <span>${schema.minimum}</span>
                  <span>${schema.maximum}</span>
                </div>
              </div>
              <input
                id=${`${inputId}-manual`}
                class="ls-range-number"
                type="number"
                .disabled=${disabled}
                .min=${String(schema.minimum)}
                .max=${String(schema.maximum)}
                .step=${String(step)}
                .value=${formattedValue}
                @input=${(event: Event) =>
                  this.updatePathValue(
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    false,
                  )}
                @change=${(event: Event) =>
                  this.updatePathValue(
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    true,
                  )}
              />
            </div>
          </div>
        `

        if (inlineSimpleValue) {
          return this.renderInlineSimpleField(
            fieldLabel,
            options,
            inputId,
            schema,
            control,
          )
        }

        return html`
          <div class="ls-leaf">
            ${this.renderLeafHeader(fieldLabel, options, path)}
            ${this.renderLeafBody(schema)}
            ${control}
          </div>
        `
      }

      const control = html`
        <input
          id=${inputId}
          type="number"
          .disabled=${disabled}
          .step=${String(step)}
          .value=${typeof value === 'number' ? formattedValue : ''}
          @input=${(event: Event) =>
            this.updatePathValue(
              path,
              parseNumericInputValue(event.target as HTMLInputElement),
              schema,
              false,
            )}
          @change=${(event: Event) =>
            this.updatePathValue(
              path,
              parseNumericInputValue(event.target as HTMLInputElement),
              schema,
              true,
            )}
        />
      `

      if (inlineSimpleValue) {
        return this.renderInlineSimpleField(
          fieldLabel,
          options,
          inputId,
          schema,
          control,
        )
      }

      return html`
        <div class="ls-leaf">
          ${this.renderLeafHeader(fieldLabel, options, path)}
          ${this.renderLeafBody(schema)}
          ${control}
        </div>
      `
    }

    const multiline =
      schema.format === 'textarea' ||
      (typeof schema.maxLength === 'number' && schema.maxLength > 200)
    const inputType = getStringInputType(schema)
    const currentValue = typeof value === 'string' ? value : ''
    const control = multiline
      ? html`
          <textarea
            id=${inputId}
            .disabled=${disabled}
            .value=${currentValue}
            @input=${(event: Event) =>
              this.updatePathValue(
                path,
                (event.target as HTMLTextAreaElement).value,
                schema,
                false,
              )}
            @change=${(event: Event) =>
              this.updatePathValue(
                path,
                (event.target as HTMLTextAreaElement).value,
                schema,
                true,
              )}
          ></textarea>
        `
      : html`
          <input
            id=${inputId}
            type=${inputType}
            .disabled=${disabled}
            .value=${currentValue}
            @input=${(event: Event) =>
              this.updatePathValue(
                path,
                (event.target as HTMLInputElement).value,
                schema,
                false,
              )}
            @change=${(event: Event) =>
              this.updatePathValue(
                path,
                (event.target as HTMLInputElement).value,
                schema,
                true,
              )}
          />
        `

    if (inlineSimpleValue && !multiline) {
      return this.renderInlineSimpleField(
        fieldLabel,
        options,
        inputId,
        schema,
        control,
      )
    }

    return html`
      <div class="ls-leaf">
        ${this.renderLeafHeader(fieldLabel, options, path)}
        ${this.renderLeafBody(schema)}
        ${control}
      </div>
    `
  }

  private renderFieldsetHeader(
    schema: JsonSchema202012,
    options: FieldRenderOptions,
    path: JsonPointerPath,
    collapsed: boolean,
  ): TemplateResult | typeof nothing {
    const text = options.label ?? schema.title
    if (!text) {
      return nothing
    }

    if (!options.present && options.onAdd) {
      return html`
        <legend class="ls-legend">
          ${this.renderOptionalAddTrigger(text, options.onAdd)}
        </legend>
      `
    }

    return html`
      <legend class="ls-legend">
        <span class="ls-legend-row">
          ${options.headerPrefix ?? nothing}
          ${options.collapsible === false
            ? html`<span class="ls-legend-static">${text}</span>`
            : html`
                <button
                  type="button"
                  class="ls-collapse-toggle ls-collapse-toggle--title"
                  @click=${() => this.toggleCollapsed(path)}
                >
                  <span class="ls-legend-text">${text}</span>
                </button>
              `}
          ${options.onRemove
            ? this.renderRemoveButton(options.onRemove)
            : nothing}
          ${options.collapsible === false
            ? nothing
            : html`
                <button
                  type="button"
                  class="ls-collapse-toggle ls-collapse-toggle--icon"
                  @click=${() => this.toggleCollapsed(path)}
                  aria-label=${collapsed ? `Expand ${text}` : `Collapse ${text}`}
                >
                  <span class="ls-legend-meta">
                    <span class="ls-disclosure">${collapsed ? '+' : '−'}</span>
                  </span>
                </button>
              `}
        </span>
      </legend>
    `
  }

  private renderLeafHeader(
    label: string,
    options: FieldRenderOptions,
    path: JsonPointerPath,
  ): TemplateResult {
    const collapsed = this.isCollapsed(path)

    if (!options.present && options.onAdd) {
      return this.renderOptionalAddTrigger(label, options.onAdd)
    }

    if (options.collapsible === false) {
      return html`
        <div class="ls-label-row">
          ${options.headerPrefix ?? nothing}
          <label class="ls-label-text">${label}</label>
          ${options.present && options.onRemove
            ? this.renderRemoveButton(options.onRemove)
            : nothing}
        </div>
      `
    }

    return html`
      <div class="ls-label-row">
        ${options.headerPrefix ?? nothing}
        <button
          type="button"
          class="ls-collapse-toggle ls-collapse-toggle--leaf ls-collapse-toggle--title"
          @click=${() => this.toggleCollapsed(path)}
        >
          <span class="ls-label-text">${label}</span>
        </button>
        ${options.present && options.onRemove
          ? this.renderRemoveButton(options.onRemove)
          : nothing}
        <button
          type="button"
          class="ls-collapse-toggle ls-collapse-toggle--icon"
          @click=${() => this.toggleCollapsed(path)}
          aria-label=${collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          <span class="ls-legend-meta">
            <span class="ls-disclosure">${collapsed ? '+' : '−'}</span>
          </span>
        </button>
      </div>
    `
  }

  private renderDescription(
    schema: JsonSchema202012,
  ): TemplateResult | typeof nothing {
    return schema.description
      ? html`<p class="ls-description">${schema.description}</p>`
      : nothing
  }

  private renderRefWarning(
    schema: JsonSchema202012,
  ): TemplateResult | typeof nothing {
    const refError = getRefError(schema)
    return refError ? html`<p class="ls-note">${refError}</p>` : nothing
  }

  private renderLeafBody(
    schema: JsonSchema202012,
  ): TemplateResult | typeof nothing {
    return html`${this.renderDescription(schema)}${this.renderRefWarning(schema)}`
  }

  private renderArrayItemReorderActions(
    path: JsonPointerPath,
    index: number,
    canMoveUp: boolean,
    canMoveDown: boolean,
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="ls-direction-button"
        ?disabled=${this.formDisabled || !canMoveUp}
        @click=${() => this.reorderArrayItem(path, index, index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        class="ls-direction-button"
        ?disabled=${this.formDisabled || !canMoveDown}
        @click=${() => this.reorderArrayItem(path, index, index + 1)}
      >
        ↓
      </button>
    `
  }

  private renderArrayItemRemoveAction(
    itemPath: JsonPointerPath,
    canRemove: boolean,
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="ls-remove-button"
        ?disabled=${this.formDisabled || !canRemove}
        @click=${() => this.removeArrayItem(itemPath)}
      >
        ×
      </button>
    `
  }

  private renderOptionalAddTrigger(
    label: string,
    onAdd: () => void,
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="ls-optional-add"
        ?disabled=${this.formDisabled}
        @click=${(event: Event) => {
          event.preventDefault()
          event.stopPropagation()
          onAdd()
        }}
        aria-label="Add optional field"
      >
        <span class="ls-inline-add-symbol">+</span>
        <span class="ls-optional-add-label">${label}</span>
      </button>
    `
  }

  private renderRemoveButton(
    action: () => void,
  ): TemplateResult {
    return html`
      <button
        type="button"
        class="ls-remove-button"
        ?disabled=${this.formDisabled}
        @click=${(event: Event) => {
          event.preventDefault()
          event.stopPropagation()
          action()
        }}
        aria-label="Remove optional field"
      >
        ×
      </button>
    `
  }

  private renderInlineSimpleField(
    label: string,
    options: FieldRenderOptions,
    inputId: string,
    schema: JsonSchema202012,
    control: TemplateResult,
    useSpanLabel = false,
  ): TemplateResult {
    return html`
      <div class="ls-leaf ls-leaf--inline">
        <div class="ls-inline-value-row">
          ${useSpanLabel
            ? html`<span class="ls-inline-value-label">${label}</span>`
            : html`<label class="ls-inline-value-label" for=${inputId}>
                ${label}
              </label>`}
          ${control}
          ${options.present && options.onRemove
            ? this.renderRemoveButton(options.onRemove)
            : nothing}
        </div>
        ${this.renderLeafBody(schema)}
      </div>
    `
  }

  private updatePathValue(
    path: JsonPointerPath,
    nextValue: JsonValue,
    schema: JsonSchema202012,
    commit: boolean,
  ) {
    const nextRootValue = setValueAtPath(this.value, path, nextValue)
    this.emitValue('input', path, nextRootValue, schema)

    if (commit) {
      this.emitValue('change', path, nextRootValue, schema)
    }
  }

  private commitRootValue(
    path: JsonPointerPath,
    nextValue: JsonValue,
    schema: JsonSchema202012,
  ) {
    this.emitValue('input', path, nextValue, schema)
    this.emitValue('change', path, nextValue, schema)
  }

  private addKnownProperty(
    objectPath: JsonPointerPath,
    key: string,
    schema: JsonSchema202012,
  ) {
    const nextValue = setValueAtPath(
      this.value,
      [...objectPath, key],
      buildInitialValue(schema, this.rootSchema),
    )
    this.commitRootValue([...objectPath, key], nextValue, schema)
  }

  private addAdditionalProperty(
    objectPath: JsonPointerPath,
    key: string,
    schema: JsonSchema202012,
  ) {
    if (!key) {
      return
    }

    const additionalSchema = this.getAdditionalPropertySchema(schema)
    const nextValue = setValueAtPath(
      this.value,
      [...objectPath, key],
      buildInitialValue(additionalSchema, this.rootSchema),
    )
    const nextDrafts = new Map(this.additionalPropertyDrafts)
    nextDrafts.delete(pathToKey(objectPath))
    this.additionalPropertyDrafts = nextDrafts
    this.commitRootValue([...objectPath, key], nextValue, additionalSchema)
  }

  private removeProperty(path: JsonPointerPath) {
    const nextValue = deleteValueAtPath(this.value, path)
    this.commitRootValue(path, nextValue, this.rootSchema)
  }

  private addArrayItem(
    path: JsonPointerPath,
    schema: JsonSchema202012,
    index: number,
  ) {
    const itemSchema = getArrayItemSchema(schema, index) ?? {}
    const currentArray = getValueAtPath(this.value, path)
    const nextArray = Array.isArray(currentArray)
      ? [...currentArray, buildInitialValue(itemSchema, this.rootSchema)]
      : [buildInitialValue(itemSchema, this.rootSchema)]
    const nextValue = setValueAtPath(this.value, path, nextArray)
    this.commitRootValue([...path, index], nextValue, itemSchema)
  }

  private removeArrayItem(path: JsonPointerPath) {
    const nextValue = deleteValueAtPath(this.value, path)
    this.commitRootValue(path, nextValue, this.rootSchema)
  }

  private reorderArrayItem(
    path: JsonPointerPath,
    fromIndex: number,
    toIndex: number,
  ) {
    const nextValue = moveArrayItem(this.value, path, fromIndex, toIndex)
    this.commitRootValue(path, nextValue, this.rootSchema)
  }

  private getAdditionalPropertySchema(
    schema: JsonSchema202012,
  ): JsonSchema202012 {
    return typeof schema.additionalProperties === 'object' &&
      schema.additionalProperties !== null
      ? schema.additionalProperties
      : {}
  }

  private canAddAdditionalProperty(schema: JsonSchema202012): boolean {
    return schema.additionalProperties === true
  }

  private omitObjectProperty(
    schema: JsonSchema202012,
    property: string,
  ): JsonSchema202012 {
    const next = { ...schema }

    if (schema.properties) {
      const { [property]: _removed, ...rest } = schema.properties
      next.properties = rest
    }

    if (schema.required) {
      next.required = schema.required.filter((entry) => entry !== property)
    }

    return next
  }

  private emitValue(
    type: 'input' | 'change',
    path: JsonPointerPath,
    nextValue: JsonValue,
    schema: JsonSchema202012,
  ) {
    const detail: JsonSchemaFormEventDetail = {
      value: cloneJsonValue(nextValue),
      path,
      schema,
    }

    this.dispatchEvent(
      new CustomEvent<JsonSchemaFormEventDetail>(type, {
        bubbles: true,
        composed: true,
        detail,
      }),
    )
  }

  private parseLiteralOption(
    rawValue: string,
    options: readonly JsonPrimitive[],
  ): JsonPrimitive {
    return options.find((option) => String(option) === rawValue) ?? rawValue
  }

  private createInputId(path: JsonPointerPath): string {
    return `ls-${pathToKey(path).replaceAll(/[^a-z0-9_-]/gi, '-')}`
  }

  private isCollapsed(path: JsonPointerPath): boolean {
    return this.collapsedSections.has(pathToKey(path))
  }

  private toggleCollapsed(path: JsonPointerPath) {
    const key = pathToKey(path)
    const next = new Set(this.collapsedSections)

    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }

    this.collapsedSections = next
  }

  private canCollapseSchema(schema: JsonSchema202012): boolean {
    const resolved = resolveSchema(schema, this.rootSchema, undefined)
    return Boolean(
      describeUnion(resolved, undefined, this.rootSchema) ||
        isObjectSchema(resolved) ||
        isArraySchema(resolved),
    )
  }

  private shouldFrameContainer(
    schema: JsonSchema202012,
    options: FieldRenderOptions,
  ): boolean {
    return options.framed !== false && this.hasNestedContainerChild(schema)
  }

  private hasNestedContainerChild(schema: JsonSchema202012): boolean {
    const resolved = resolveSchema(schema, this.rootSchema, undefined)
    const union = describeUnion(resolved, undefined, this.rootSchema)

    if (union) {
      const branches = resolved.oneOf ?? resolved.anyOf ?? []
      return branches.some((branch) => this.canCollapseSchema(branch))
    }

    if (isObjectSchema(resolved)) {
      const properties = Object.values(resolved.properties ?? {})
      const additional =
        typeof resolved.additionalProperties === 'object' &&
        resolved.additionalProperties !== null
          ? [resolved.additionalProperties]
          : []

      return [...properties, ...additional].some((child) =>
        this.canCollapseSchema(child),
      )
    }

    if (isArraySchema(resolved)) {
      const prefixItems = resolved.prefixItems ?? []
      const items =
        typeof resolved.items === 'object' && resolved.items !== null
          ? [resolved.items]
          : []

      return [...prefixItems, ...items].some((child) =>
        this.canCollapseSchema(child),
      )
    }

    return false
  }

  private getFieldClassNames(kind: string, framed: boolean): string {
    return framed ? `ls-field ${kind}` : `ls-field ls-field--bare ${kind}`
  }

  private isSimpleArrayItemSchema(schema: JsonSchema202012): boolean {
    const resolved = resolveSchema(schema, this.rootSchema, undefined)
    return !(
      describeUnion(resolved, undefined, this.rootSchema) ||
      isObjectSchema(resolved) ||
      isArraySchema(resolved)
    )
  }

  private isCompactObjectArrayItemSchema(schema: JsonSchema202012): boolean {
    const resolved = resolveSchema(schema, this.rootSchema, undefined)

    if (!isObjectSchema(resolved)) {
      return false
    }

    if (describeUnion(resolved, undefined, this.rootSchema)) {
      return false
    }

    if (resolved.additionalProperties !== false) {
      return false
    }

    const properties = Object.values(resolved.properties ?? {})
    if (properties.length === 0 || properties.length > 2) {
      return false
    }

    return properties.every((child) => {
      const resolvedChild = resolveSchema(child, this.rootSchema, undefined)
      return !(
        describeUnion(resolvedChild, undefined, this.rootSchema) ||
        isObjectSchema(resolvedChild) ||
        isArraySchema(resolvedChild)
      )
    })
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'json-schema-form': JsonSchemaFormElement
  }
}
