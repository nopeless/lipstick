import { html, nothing, type TemplateResult } from "lit";
import {
  acceptsType,
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
} from "../lib/schema.js";
import {
  formatNumericValue,
  getNumericInputStep,
  getStringInputType,
  parseNumericInputValue,
} from "../lib/input.js";
import type { JsonSchemaFormContext, FieldRenderOptions } from "./shared.js";
import type { JsonPointerPath, JsonSchema202012, JsonValue } from "../lib/types.js";
import { getValueAtPath, isJsonObject } from "../lib/value.js";
import {
  addAdditionalProperty,
  addArrayItem,
  addKnownProperty,
  canAddAdditionalProperty,
  canCollapseSchema,
  createInputId,
  getAdditionalPropertySchema,
  isCollapsed,
  omitObjectProperty,
  parseLiteralOption,
  reorderArrayItem,
  removeArrayItem,
  removeProperty,
  toggleCollapsed,
  updatePathValue,
} from "./state.js";

export function renderForm(ctx: JsonSchemaFormContext) {
  if (!ctx.schema) {
    return nothing;
  }

  const rootSchema = ctx.rootSchema;
  const schema = resolveSchema(rootSchema, rootSchema, ctx.value);
  const serializedValue = JSON.stringify(ctx.value ?? null);

  return html`
    ${renderNode(ctx, schema, ctx.value, [], {
      required: true,
      present: true,
      framed: true,
      collapsible: false,
    })}
    ${ctx.name ? html`<input type="hidden" name=${ctx.name} .value=${serializedValue} />` : nothing}
  `;
}

function renderNode(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const rootSchema = ctx.rootSchema;
  const resolved = resolveSchema(schema, rootSchema, value);
  const union = describeUnion(
    resolved,
    value,
    rootSchema,
    ctx.branchSelections.get(pathToKey(path)),
  );

  if (!options.present && !options.required) {
    return renderCollapsedOptionalField(ctx, resolved, path, options);
  }

  if (union) {
    if (schema.anyOf?.length && isCycledPrimitiveUnion(schema, rootSchema)) {
      return renderPrimitiveUnionField(ctx, schema, value, path, options, union)
    }

    return renderUnionField(ctx, resolved, value, path, options, union);
  }

  if (resolved.const !== undefined || resolved.enum?.length) {
    return renderScalarField(ctx, resolved, value, path, options);
  }

  if (isObjectSchema(resolved)) {
    return renderObjectField(ctx, resolved, value, path, options);
  }

  if (isArraySchema(resolved)) {
    return renderArrayField(ctx, resolved, value, path, options);
  }

  return renderScalarField(ctx, resolved, value, path, options);
}

function renderCollapsedOptionalField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const label = options.label ?? schema.title ?? "Field";
  const collapsedOptions = { ...options, collapsible: false };

  return html`
    <section class="lipstick-leaf lipstick-leaf--collapsed">
      ${renderLeafHeader(ctx, label, collapsedOptions, path)}
    </section>
  `;
}

function renderUnionField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
  union: NonNullable<ReturnType<typeof describeUnion>>,
): TemplateResult {
  const rootSchema = ctx.rootSchema;
  const branches = schema.oneOf ?? schema.anyOf ?? [];
  const branchSchema = resolveSchema(branches[union.selectedIndex], rootSchema, value);
  const pathKey = pathToKey(path);
  const collapsed = isCollapsed(ctx, path);

  const changeBranch = (index: number) => {
    ctx.branchSelections = new Map(ctx.branchSelections).set(pathKey, index);
    const nextValue = sanitizeValueForSchema(value, branches[index], rootSchema);
    updatePathValue(ctx, path, nextValue, branches[index], true);
  };

  return html`
    <fieldset>
      ${renderFieldsetHeader(ctx, schema, options, path, collapsed)}
      ${collapsed
        ? nothing
        : html`
            ${renderDescription(schema)} ${renderRefWarning(schema)}
            ${renderUnionSelector(ctx, schema, union, changeBranch)}
            <div>${renderUnionBranch(ctx, branchSchema, value, path, union)}</div>
          `}
    </fieldset>
  `;
}

function isCycledPrimitiveUnion(
  schema: JsonSchema202012,
  rootSchema: JsonSchema202012,
): boolean {
  const branches = schema.anyOf ?? [];

  return (
    branches.length > 1 &&
    branches.every((branch) => {
      const resolved = resolveSchema(branch, rootSchema, undefined);
      return !isObjectSchema(resolved) && !isArraySchema(resolved);
    })
  );
}

function renderPrimitiveUnionField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
  union: NonNullable<ReturnType<typeof describeUnion>>,
): TemplateResult {
  const rootSchema = ctx.rootSchema;
  const branches = schema.anyOf ?? [];
  const branchSchema = resolveSchema(branches[union.selectedIndex], rootSchema, value);
  const pathKey = pathToKey(path);
  const inputId = createInputId(path);
  const changeBranch = (index: number) => {
    ctx.branchSelections = new Map(ctx.branchSelections).set(pathKey, index);
    const nextValue = sanitizeValueForSchema(value, branches[index], rootSchema);
    updatePathValue(ctx, path, nextValue, branches[index], true);
  };

  const cycleButton =
    branches.length > 1
      ? html`
          <button
            type="button"
            class="lipstick-cycle"
            ?disabled=${ctx.formDisabled}
            @click=${() => changeBranch((union.selectedIndex + 1) % branches.length)}
            aria-label="Cycle variant"
          >
            cycle
          </button>
        `
      : nothing;

  return renderInlineSimpleField(
    ctx,
    options.label ?? schema.title ?? "Value",
    options,
    inputId,
    schema,
    renderPrimitiveUnionControl(ctx, branchSchema, value, path, inputId, ctx.formDisabled || branchSchema.readOnly === true),
    acceptsType(branchSchema, "boolean") || acceptsType(branchSchema, "null"),
    cycleButton,
  );
}

function renderPrimitiveUnionControl(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  inputId: string,
  disabled: boolean,
): TemplateResult {
  if (schema.const !== undefined) {
    return html`<output id=${inputId}>${String(schema.const)}</output>`;
  }

  if (schema.enum?.length) {
    const optionsList = schema.enum ?? [];
    const normalizedValue =
      value !== undefined && optionsList.includes(value as never)
        ? String(value)
        : String(optionsList[0] ?? "");

    return html`
      <select
        id=${inputId}
        .disabled=${disabled}
        .value=${normalizedValue}
        @change=${(event: Event) => {
          const nextValue = parseLiteralOption(
            (event.target as HTMLSelectElement).value,
            optionsList,
          );
          updatePathValue(ctx, path, nextValue, schema, true);
        }}
      >
        ${optionsList.map(
          (option) => html`<option value=${String(option)}>${String(option)}</option>`,
        )}
      </select>
    `;
  }

  if (acceptsType(schema, "boolean")) {
    return html`
      <label class="lipstick-switch" for=${inputId}>
        <input
          id=${inputId}
          type="checkbox"
          .disabled=${disabled}
          .checked=${value === true}
          @change=${(event: Event) =>
            updatePathValue(
              ctx,
              path,
              (event.target as HTMLInputElement).checked,
              schema,
              true,
            )}
        />
        <span class="lipstick-switch-track" aria-hidden="true">
          <span class="lipstick-switch-thumb"></span>
        </span>
      </label>
    `;
  }

  if (acceptsType(schema, "integer") || acceptsType(schema, "number")) {
    const numericValue =
      typeof value === "number" ? value : typeof schema.minimum === "number" ? schema.minimum : 0;
    const step = getNumericInputStep(schema);
    const formattedValue = formatNumericValue(numericValue, step);

    if (typeof schema.minimum === "number" && typeof schema.maximum === "number") {
      return html`
        <div class="lipstick-range">
          <div class="lipstick-range-controls">
            <div class="lipstick-range-main">
              <input
                id=${inputId}
                type="range"
                .disabled=${disabled}
                .min=${String(schema.minimum)}
                .max=${String(schema.maximum)}
                .step=${String(step)}
                .value=${String(numericValue)}
                @input=${(event: Event) =>
                  updatePathValue(
                    ctx,
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    false,
                  )}
                @change=${(event: Event) =>
                  updatePathValue(
                    ctx,
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    true,
                  )}
              />
              <div class="lipstick-range-meta">
                <span>${schema.minimum}</span>
                <span>${schema.maximum}</span>
              </div>
            </div>
            <input
              id=${`${inputId}-manual`}
              class="lipstick-range-number"
              type="number"
              .disabled=${disabled}
              .min=${String(schema.minimum)}
              .max=${String(schema.maximum)}
              .step=${String(step)}
              .value=${formattedValue}
              @input=${(event: Event) =>
                updatePathValue(
                  ctx,
                  path,
                  parseNumericInputValue(event.target as HTMLInputElement),
                  schema,
                  false,
                )}
              @change=${(event: Event) =>
                updatePathValue(
                  ctx,
                  path,
                  parseNumericInputValue(event.target as HTMLInputElement),
                  schema,
                  true,
                )}
            />
          </div>
        </div>
      `;
    }

    return html`
      <input
        id=${inputId}
        type="number"
        .disabled=${disabled}
        .step=${String(step)}
        .value=${typeof value === "number" ? formattedValue : ""}
        @input=${(event: Event) =>
          updatePathValue(
            ctx,
            path,
            parseNumericInputValue(event.target as HTMLInputElement),
            schema,
            false,
          )}
        @change=${(event: Event) =>
          updatePathValue(
            ctx,
            path,
            parseNumericInputValue(event.target as HTMLInputElement),
            schema,
            true,
          )}
      />
    `;
  }

  if (acceptsType(schema, "null")) {
    return html`<code class="lipstick-null-value">null</code>`;
  }

  const multiline =
    schema.format === "textarea" ||
    (typeof schema.maxLength === "number" && schema.maxLength > 200);
  const inputType = getStringInputType(schema);
  const currentValue = typeof value === "string" ? value : "";

  return multiline
    ? html`
        <textarea
          id=${inputId}
          placeholder="Enter a value"
          .disabled=${disabled}
          .value=${currentValue}
          @input=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, false)}
          @change=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, true)}
        ></textarea>
      `
    : html`
        <input
          id=${inputId}
          type=${inputType}
          placeholder="Enter a value"
          .disabled=${disabled}
          .value=${currentValue}
          @input=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLInputElement).value, schema, false)}
          @change=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLInputElement).value, schema, true)}
        />
      `;
}

function renderUnionBranch(
  ctx: JsonSchemaFormContext,
  branchSchema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  union: NonNullable<ReturnType<typeof describeUnion>>,
): TemplateResult {
  const schema =
    union.discriminator && isObjectSchema(branchSchema)
      ? omitObjectProperty(branchSchema, union.discriminator.property)
      : branchSchema;

  return renderNode(ctx, schema, value, path, {
    required: true,
    present: true,
    framed: false,
    collapsible: false,
  });
}

function renderUnionSelector(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  union: NonNullable<ReturnType<typeof describeUnion>>,
  changeBranch: (index: number) => void,
): TemplateResult {
  if (schema.anyOf?.length && union.kind !== "discriminator") {
    return html`
      <label>
        <span>Variant</span>
        <select
          .disabled=${ctx.formDisabled}
          .value=${String(union.selectedIndex)}
          @change=${(event: Event) =>
            changeBranch(Number((event.target as HTMLSelectElement).value))}
        >
          ${union.options.map(
            (option) => html` <option value=${String(option.index)}>${option.label}</option> `,
          )}
        </select>
      </label>
    `;
  }

  if (union.kind === "discriminator" && union.discriminator) {
    return html`
      <label>
        <span>${humanizeLabel(union.discriminator.property)}</span>
        <select
          .disabled=${ctx.formDisabled}
          .value=${String(union.selectedIndex)}
          @change=${(event: Event) =>
            changeBranch(Number((event.target as HTMLSelectElement).value))}
        >
          ${union.discriminator.options.map(
            (option) => html`
              <option value=${String(option.index)}>${String(option.value)}</option>
            `,
          )}
        </select>
      </label>
    `;
  }

  if (union.kind === "generic") {
    return html`
      <label>
        <span>Variant</span>
        <select
          .disabled=${ctx.formDisabled}
          .value=${String(union.selectedIndex)}
          @change=${(event: Event) =>
            changeBranch(Number((event.target as HTMLSelectElement).value))}
        >
          ${union.options.map(
            (option) => html` <option value=${String(option.index)}>${option.label}</option> `,
          )}
        </select>
      </label>
    `;
  }

  return html`
    <div role="radiogroup">
      ${union.options.map(
        (option) => html`
          <button
            type="button"
            aria-pressed=${(option.index === union.selectedIndex).toString()}
            ?disabled=${ctx.formDisabled}
            @click=${() => changeBranch(option.index)}
          >
            ${option.literal ?? option.label}
          </button>
        `,
      )}
    </div>
  `;
}

function renderObjectField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const objectValue = isJsonObject(value) ? value : {};
  const properties = schema.properties ?? {};
  const requiredSet = getRequiredProperties(schema, objectValue);
  const propertyEntries = Object.entries(properties);
  const additionalKeys = Object.keys(objectValue).filter((key) => !(key in properties));
  const body = renderObjectBody(
    ctx,
    schema,
    objectValue,
    path,
    propertyEntries,
    requiredSet,
    additionalKeys,
  );

  const framed = options.framed ?? true;

  if (!framed) {
    return html`<section>${body}</section>`;
  }

  const collapsed = isCollapsed(ctx, path);

  return html`
    <fieldset>
      ${renderFieldsetHeader(ctx, schema, options, path, collapsed)}
      ${collapsed
        ? nothing
        : html` ${renderDescription(schema)} ${renderRefWarning(schema)} ${body} `}
    </fieldset>
  `;
}

function renderObjectBody(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  objectValue: Record<string, JsonValue>,
  path: JsonPointerPath,
  propertyEntries: Array<[string, JsonSchema202012]>,
  requiredSet: Set<string>,
  additionalKeys: string[],
): TemplateResult {
  return html`
    <div>
      ${propertyEntries.map(([key, childSchema]) => {
        const required = requiredSet.has(key);
        const present = required || key in objectValue;

        return renderObjectProperty(ctx, childSchema, objectValue[key], [...path, key], {
          label: childSchema.title ?? humanizeLabel(key),
          required,
          present,
          framed: true,
          collapsible: canCollapseSchema(ctx, childSchema),
          onAdd: required ? undefined : () => addKnownProperty(ctx, path, key, childSchema),
          onRemove: required ? undefined : () => removeProperty(ctx, [...path, key]),
        });
      })}
      ${additionalKeys.map((key) =>
        renderObjectProperty(ctx, getAdditionalPropertySchema(schema), objectValue[key], [...path, key], {
          label: humanizeLabel(key),
          required: false,
          present: true,
          framed: true,
          collapsible: canCollapseSchema(ctx, getAdditionalPropertySchema(schema)),
          onRemove: () => removeProperty(ctx, [...path, key]),
        }),
      )}
    </div>
    ${schema.additionalProperties !== false
      ? renderAdditionalPropertyComposer(ctx, schema, path)
      : nothing}
  `;
}

function renderObjectProperty(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  return html`
    ${renderNode(ctx, schema, value, path, options)}
  `;
}

function renderAdditionalPropertyComposer(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
): TemplateResult | typeof nothing {
  const pathKey = pathToKey(path);
  const draft = ctx.additionalPropertyDrafts.get(pathKey) ?? "";
  const canAdd = canAddAdditionalProperty(schema);

  if (!canAdd) {
    return nothing;
  }

  return html`
    <div class="lipstick-additional-composer">
      <button
        type="button"
        class="lipstick-add"
        ?disabled=${ctx.formDisabled || !canAdd || !draft.trim()}
        @click=${() => addAdditionalProperty(ctx, path, draft.trim(), schema)}
        aria-label="Add new property"
      >
        <span aria-hidden="true">+</span>
      </button>
      <input
        type="text"
        placeholder="add new property"
        .disabled=${ctx.formDisabled || !canAdd}
        .value=${draft}
        @input=${(event: Event) => {
          const nextValue = (event.target as HTMLInputElement).value;
          ctx.additionalPropertyDrafts = new Map(ctx.additionalPropertyDrafts).set(
            pathKey,
            nextValue,
          );
        }}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          addAdditionalProperty(ctx, path, draft.trim(), schema);
        }}
      />
    </div>
  `;
}

function renderArrayField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const arrayValue = Array.isArray(value) ? value : [];
  const nextIndex = arrayValue.length;
  const addSchema = getArrayItemSchema(schema, nextIndex) ?? {};
  const addLabel = addSchema.title;
  const canAdd = schema.items !== false || nextIndex < (schema.prefixItems?.length ?? 0);
  const body = renderArrayBody(ctx, schema, arrayValue, path, nextIndex, addLabel, canAdd);

  const framed = options.framed ?? true;

  if (!framed) {
    return html`<section>${body}</section>`;
  }

  const collapsed = isCollapsed(ctx, path);

  return html`
    <fieldset>
      ${renderFieldsetHeader(ctx, schema, options, path, collapsed)}
      ${collapsed
        ? nothing
        : html` ${renderDescription(schema)} ${renderRefWarning(schema)} ${body} `}
    </fieldset>
  `;
}

function renderArrayBody(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  arrayValue: JsonValue[],
  path: JsonPointerPath,
  nextIndex: number,
  addLabel: string | undefined,
  canAdd: boolean,
): TemplateResult {
  return html`
    <div>
      ${arrayValue.map((item, index) => renderArrayItem(ctx, schema, item, path, index))}
    </div>
    ${canAdd
      ? html`
          <button
            type="button"
            class="lipstick-add"
            ?disabled=${ctx.formDisabled}
            aria-label=${addLabel ? `Add ${addLabel}` : "Add item"}
            @click=${() => addArrayItem(ctx, path, schema, nextIndex)}
          >
            +
          </button>
        `
      : nothing}
  `;
}

function renderArrayItem(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  item: JsonValue,
  path: JsonPointerPath,
  index: number,
): TemplateResult {
  const itemPath = [...path, index];
  const itemSchema = getArrayItemSchema(schema, index) ?? {};
  const canRemove = index >= (schema.minItems ?? 0);
  const arrayValue = getValueAtPath(ctx.value, path);
  const canMoveUp = index > 0;
  const canMoveDown = Array.isArray(arrayValue) && index < arrayValue.length - 1;
  const isSimpleItem = isSimpleArrayItemSchema(ctx, itemSchema);
  const simpleItemLabel = formatSimpleArrayItemLabel(itemSchema, index);
  const objectItemLabel = formatObjectArrayItemLabel(itemSchema, index);

  if (isSimpleItem) {
    return html`
      <div class="lipstick-array-row lipstick-array-row--simple">
        <div>
          ${renderNode(ctx, itemSchema, item, itemPath, {
            label: simpleItemLabel ?? "",
            required: index < (schema.minItems ?? 0),
            present: true,
            framed: false,
            collapsible: false,
            onRemove: undefined,
          })}
        </div>
        <div class="lipstick-array-actions lipstick-array-actions--side">
          ${renderArrayItemReorderActions(ctx, path, index, canMoveUp, canMoveDown)}
          ${renderArrayItemRemoveAction(ctx, itemPath, canRemove)}
        </div>
      </div>
    `;
  }

  return html`
    <div class="lipstick-array-row lipstick-array-row--object">
      ${renderNode(ctx, itemSchema, item, itemPath, {
        label: objectItemLabel,
        required: index < (schema.minItems ?? 0),
        present: true,
        framed: true,
        collapsible: false,
        headerPrefix: html`${renderArrayItemReorderActions(ctx, path, index, canMoveUp, canMoveDown)}`,
        removeLabel: "Delete array item",
        onRemove: canRemove ? () => removeArrayItem(ctx, itemPath) : undefined,
      })}
    </div>
  `;
}

function isSimpleArrayItemSchema(ctx: JsonSchemaFormContext, schema: JsonSchema202012): boolean {
  const resolved = resolveSchema(schema, ctx.rootSchema, undefined);
  return !(
    describeUnion(resolved, undefined, ctx.rootSchema) ||
    isObjectSchema(resolved) ||
    isArraySchema(resolved)
  );
}

function renderScalarField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const fieldLabel = options.label ?? schema.title ?? "Value";
  const inputId = createInputId(path);
  const disabled = ctx.formDisabled || schema.readOnly === true;
  const inlineSimpleValue = !schema.description && !acceptsType(schema, "boolean");

  if (schema.const !== undefined) {
    const control = html`
      <output id=${inputId}>${String(schema.const)}</output>
    `;

    if (inlineSimpleValue) {
      return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control, true);
    }

    return html`
      <section class="lipstick-leaf">
        ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
      </section>
    `;
  }

  if (schema.enum?.length) {
    const optionsList = schema.enum ?? [];
    const normalizedValue =
      value !== undefined && optionsList.includes(value as never)
        ? String(value)
        : String(optionsList[0] ?? "");
    const control = html`
      <select
        id=${inputId}
        .disabled=${disabled}
        .value=${normalizedValue}
        @change=${(event: Event) => {
          const nextValue = parseLiteralOption(
            (event.target as HTMLSelectElement).value,
            optionsList,
          );
          updatePathValue(ctx, path, nextValue, schema, true);
        }}
      >
        ${optionsList.map(
          (option) => html` <option value=${String(option)}>${String(option)}</option> `,
        )}
      </select>
    `;

    if (inlineSimpleValue) {
      return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control);
    }

    return html`
      <section class="lipstick-leaf">
        ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
      </section>
    `;
  }

  if (acceptsType(schema, "boolean")) {
    return html`
      <section class="lipstick-leaf lipstick-toggle">
        <header>
          ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)}
        </header>
        <label class="lipstick-switch" for=${inputId}>
            <input
              id=${inputId}
              type="checkbox"
              .disabled=${disabled}
              .checked=${value === true}
              @change=${(event: Event) =>
                updatePathValue(
                  ctx,
                  path,
                  (event.target as HTMLInputElement).checked,
                  schema,
                  true,
                )}
            />
            <span class="lipstick-switch-track" aria-hidden="true">
              <span class="lipstick-switch-thumb"></span>
            </span>
        </label>
      </section>
    `;
  }

  if (acceptsType(schema, "integer") || acceptsType(schema, "number")) {
    const numericValue =
      typeof value === "number" ? value : typeof schema.minimum === "number" ? schema.minimum : 0;
    const step = getNumericInputStep(schema);
    const formattedValue = formatNumericValue(numericValue, step);

    if (typeof schema.minimum === "number" && typeof schema.maximum === "number") {
      const control = html`
        <div class="lipstick-range">
          <div class="lipstick-range-controls">
            <div class="lipstick-range-main">
              <input
                id=${inputId}
                type="range"
                .disabled=${disabled}
                .min=${String(schema.minimum)}
                .max=${String(schema.maximum)}
                .step=${String(step)}
                .value=${String(numericValue)}
                @input=${(event: Event) =>
                  updatePathValue(
                    ctx,
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    false,
                  )}
                @change=${(event: Event) =>
                  updatePathValue(
                    ctx,
                    path,
                    parseNumericInputValue(event.target as HTMLInputElement),
                    schema,
                    true,
                  )}
              />
              <div class="lipstick-range-meta">
                <span>${schema.minimum}</span>
                <span>${schema.maximum}</span>
              </div>
            </div>
            <input
              id=${`${inputId}-manual`}
              class="lipstick-range-number"
              type="number"
              .disabled=${disabled}
              .min=${String(schema.minimum)}
              .max=${String(schema.maximum)}
              .step=${String(step)}
              .value=${formattedValue}
              @input=${(event: Event) =>
                updatePathValue(
                  ctx,
                  path,
                  parseNumericInputValue(event.target as HTMLInputElement),
                  schema,
                  false,
                )}
              @change=${(event: Event) =>
                updatePathValue(
                  ctx,
                  path,
                  parseNumericInputValue(event.target as HTMLInputElement),
                  schema,
                  true,
                )}
            />
          </div>
        </div>
      `;

      if (inlineSimpleValue) {
        return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control);
      }

      return html`
        <section class="lipstick-leaf">
          ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
        </section>
      `;
    }

    const control = html`
      <input
        id=${inputId}
        type="number"
        .disabled=${disabled}
        .step=${String(step)}
        .value=${typeof value === "number" ? formattedValue : ""}
        @input=${(event: Event) =>
          updatePathValue(
            ctx,
            path,
            parseNumericInputValue(event.target as HTMLInputElement),
            schema,
            false,
          )}
        @change=${(event: Event) =>
          updatePathValue(
            ctx,
            path,
            parseNumericInputValue(event.target as HTMLInputElement),
            schema,
            true,
          )}
      />
    `;

    if (inlineSimpleValue) {
      return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control);
    }

    return html`
      <section class="lipstick-leaf">
        ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
      </section>
    `;
  }

  if (acceptsType(schema, "null")) {
    const control = html`<code id=${inputId} class="lipstick-null-value">null</code>`;

    if (inlineSimpleValue) {
      return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control, true);
    }

    return html`
      <section class="lipstick-leaf">
        ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
      </section>
    `;
  }

  const multiline =
    schema.format === "textarea" ||
    (typeof schema.maxLength === "number" && schema.maxLength > 200);
  const inputType = getStringInputType(schema);
  const currentValue = typeof value === "string" ? value : "";
  const control = multiline
    ? html`
        <textarea
          id=${inputId}
          placeholder="Enter a value"
          .disabled=${disabled}
          .value=${currentValue}
          @input=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, false)}
          @change=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, true)}
        ></textarea>
      `
    : html`
        <input
          id=${inputId}
          type=${inputType}
          placeholder="Enter a value"
          .disabled=${disabled}
          .value=${currentValue}
          @input=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLInputElement).value, schema, false)}
          @change=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLInputElement).value, schema, true)}
        />
      `;

  if (inlineSimpleValue && !multiline) {
    return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control);
  }

  return html`
    <section class="lipstick-leaf">
      ${renderLeafHeader(ctx, fieldLabel, options, path)} ${renderLeafBody(schema)} ${control}
    </section>
  `;
}

function renderFieldsetHeader(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  options: FieldRenderOptions,
  path: JsonPointerPath,
  collapsed: boolean,
): TemplateResult | typeof nothing {
  const text = options.label ?? schema.title;
  if (!text) {
    return nothing;
  }

  if (!options.present && options.onAdd) {
    return html`
      <legend>${renderOptionalAddTrigger(ctx, text, options.onAdd)}</legend>
    `;
  }

  return html`
    <legend>
      ${options.headerPrefix ?? nothing}
      ${options.collapsible === false
        ? text
        : html`
            <button
              type="button"
              @click=${() => toggleCollapsed(ctx, path)}
              aria-expanded=${(!collapsed).toString()}
              aria-label=${collapsed ? `Expand ${text}` : `Collapse ${text}`}
            >
              <span>${text}</span>
              <span aria-hidden="true">
                ${collapsed ? "+" : "−"}
              </span>
            </button>
          `}
      ${options.onRemove ? renderRemoveButton(ctx, options.onRemove, options.removeLabel) : nothing}
    </legend>
  `;
}

function renderLeafHeader(
  ctx: JsonSchemaFormContext,
  label: string,
  options: FieldRenderOptions,
  path: JsonPointerPath,
): TemplateResult {
  const collapsed = isCollapsed(ctx, path);

  if (!options.present && options.onAdd) {
    return renderOptionalAddTrigger(ctx, label, options.onAdd);
  }

  if (options.collapsible === false) {
    return html`
      <header>
        ${options.headerPrefix ?? nothing}
        <span>${label}</span>
        ${options.present && options.onRemove
          ? renderRemoveButton(ctx, options.onRemove, options.removeLabel)
          : nothing}
      </header>
    `;
  }

  return html`
    <header>
      ${options.headerPrefix ?? nothing}
      <button
        type="button"
        @click=${() => toggleCollapsed(ctx, path)}
        aria-expanded=${(!collapsed).toString()}
        aria-label=${collapsed ? `Expand ${label}` : `Collapse ${label}`}
      >
        <span>${label}</span>
        <span aria-hidden="true">
          ${collapsed ? "+" : "−"}
        </span>
      </button>
      ${options.present && options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel)
        : nothing}
    </header>
  `;
}

function renderDescription(schema: JsonSchema202012): TemplateResult | typeof nothing {
  return schema.description
    ? html`<p class="lipstick-description">${schema.description}</p>`
    : nothing;
}

function renderRefWarning(schema: JsonSchema202012): TemplateResult | typeof nothing {
  const refError = getRefError(schema);
  return refError ? html`<p class="lipstick-note">${refError}</p>` : nothing;
}

function renderLeafBody(schema: JsonSchema202012): TemplateResult | typeof nothing {
  return html`${renderDescription(schema)}${renderRefWarning(schema)}`;
}

function formatSimpleArrayItemLabel(schema: JsonSchema202012, index: number): string | undefined {
  const title = schema.title?.trim();
  return title ? `${title} ${index + 1}` : undefined;
}

function formatObjectArrayItemLabel(schema: JsonSchema202012, index: number): string {
  const title = schema.title?.trim() || "Item";
  return `${title} ${index + 1}`;
}

function renderArrayItemReorderActions(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  index: number,
  canMoveUp: boolean,
  canMoveDown: boolean,
): TemplateResult {
  return html`
    <button
      type="button"
      class="lipstick-move-up"
      ?disabled=${ctx.formDisabled || !canMoveUp}
      @click=${() => reorderArrayItem(ctx, path, index, index - 1)}
      aria-label="Move item up"
    >
      ↑
    </button>
    <button
      type="button"
      class="lipstick-move-down"
      ?disabled=${ctx.formDisabled || !canMoveDown}
      @click=${() => reorderArrayItem(ctx, path, index, index + 1)}
      aria-label="Move item down"
    >
      ↓
    </button>
  `;
}

function renderArrayItemRemoveAction(
  ctx: JsonSchemaFormContext,
  itemPath: JsonPointerPath,
  canRemove: boolean,
): TemplateResult {
  return html`
    <button
      type="button"
      class="lipstick-remove"
      ?disabled=${ctx.formDisabled || !canRemove}
      @click=${() => removeArrayItem(ctx, itemPath)}
      aria-label="Delete array item"
    >
      ×
    </button>
  `;
}

function renderOptionalAddTrigger(
  ctx: JsonSchemaFormContext,
  label: string,
  onAdd: () => void,
): TemplateResult {
  return html`
    <button
      type="button"
      class="lipstick-add"
      ?disabled=${ctx.formDisabled}
      @click=${(event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        onAdd();
      }}
      aria-label="Add optional field"
    >
      <span aria-hidden="true">+</span>
      <span>${label}</span>
    </button>
  `;
}

function renderRemoveButton(
  ctx: JsonSchemaFormContext,
  action: () => void,
  label = "Remove optional field",
): TemplateResult {
  return html`
    <button
      type="button"
      class="lipstick-remove"
      ?disabled=${ctx.formDisabled}
      @click=${(event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      }}
      aria-label=${label}
    >
      ×
    </button>
  `;
}

function renderInlineSimpleField(
  ctx: JsonSchemaFormContext,
  label: string,
  options: FieldRenderOptions,
  inputId: string,
  schema: JsonSchema202012,
  control: TemplateResult,
  useSpanLabel = false,
  afterControl: TemplateResult | typeof nothing = nothing,
): TemplateResult {
  const hasLabel = Boolean(label.trim());

  return html`
    <section class="lipstick-leaf lipstick-leaf--inline">
      <div
        class=${hasLabel
          ? "lipstick-inline-value-row"
          : "lipstick-inline-value-row lipstick-inline-value-row--no-label"}
      >
        ${hasLabel
          ? useSpanLabel
            ? html`<span>${label}</span>`
            : html`<label for=${inputId}> ${label} </label>`
          : nothing}
        ${control}
        ${afterControl}
        ${options.present && options.onRemove
          ? renderRemoveButton(ctx, options.onRemove, options.removeLabel)
          : nothing}
      </div>
      ${renderLeafBody(schema)}
    </section>
  `;
}
