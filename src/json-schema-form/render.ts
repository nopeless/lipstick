import { html, nothing, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
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
} from "../lib/schema.js";
import {
  formatDateTimeForInput,
  formatNumericValue,
  getNumericInputStep,
  getStringInputType,
  normalizeDateTimeFromInput,
  parseNumericInputValue,
} from "../lib/input.js";
import type { JsonSchemaFormContext, FieldRenderOptions } from "./shared.js";
import type { JsonPointerPath, JsonSchema202012, JsonValue } from "../lib/types.js";
import { getValueAtPath, isJsonObject } from "../lib/value.js";
import { getFieldMessagesForSchema } from "../lib/validation.js";
import {
  addAdditionalProperty,
  addArrayItem,
  addKnownProperty,
  canAddAdditionalProperty,
  canCollapseSchema,
  createInputId,
  getAdditionalPropertySchema,
  isCollapsed,
  isSimpleArrayItemSchema,
  omitObjectProperty,
  parseLiteralOption,
  reorderArrayItem,
  removeArrayItem,
  removeProperty,
  switchUnionBranch,
  toggleCollapsed,
  updatePathValue,
} from "./state.js";

interface ScalarControlOptions {
  inputId: string;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  describedBy?: string;
}

interface ScalarControlResult {
  control: TemplateResult;
  useSpanLabel: boolean;
  multiline: boolean;
  isBoolean: boolean;
}

interface ArrayMutationRules {
  nextIndex: number;
  canAdd: boolean;
  canRemoveAny: boolean;
  canMutate: boolean;
}

export function renderForm(ctx: JsonSchemaFormContext) {
  if (!ctx.schema) {
    return nothing;
  }

  if (ctx.validation.schemaError) {
    return html`<p role="alert">${ctx.validation.schemaError}</p>`;
  }

  const schema = resolveSchema(ctx.rootSchema, ctx.rootSchema, ctx.value);

  return html`
    ${renderNode(ctx, schema, ctx.value, [], {
      required: true,
      present: true,
      framed: true,
      collapsible: false,
    })}
    ${ctx.name
      ? html`<input type="hidden" name=${ctx.name} .value=${JSON.stringify(ctx.value ?? null)} />`
      : nothing}
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
      return renderPrimitiveUnionField(ctx, schema, value, path, options, union);
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

  return html`
    <section>${renderLeafHeader(ctx, label, { ...options, collapsible: false }, path)}</section>
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

  const changeBranch = (index: number) => {
    switchUnionBranch(ctx, path, value, branches, rootSchema, index);
  };

  return renderFramedFieldset(
    ctx,
    schema,
    options,
    path,
    value,
    html`
      ${renderUnionSelector(ctx, schema, union, changeBranch)}
      ${renderUnionBranch(ctx, branchSchema, value, path, union)}
    `,
  );
}

function isCycledPrimitiveUnion(schema: JsonSchema202012, rootSchema: JsonSchema202012): boolean {
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
  const inputId = createInputId(ctx, path);
  const messages = getFieldMessages(ctx, path, schema, value);
  const scalarControl = renderScalarControl(ctx, branchSchema, value, path, {
    inputId,
    disabled: ctx.formDisabled || branchSchema.readOnly === true,
    required: options.required,
    invalid: messages.length > 0,
    describedBy: getControlDescribedBy(ctx, schema, path, value),
  });

  const cycleButton =
    branches.length > 1
      ? html`
          <button
            type="button"
            class="lipstick-cycle"
            ?disabled=${ctx.formDisabled}
            @click=${() =>
              switchUnionBranch(
                ctx,
                path,
                value,
                branches,
                rootSchema,
                (union.selectedIndex + 1) % branches.length,
              )}
            aria-label="Cycle variant"
          >
            ⇄
          </button>
        `
      : nothing;

  return renderInlineSimpleField(
    ctx,
    options.label ?? schema.title ?? "Value",
    options,
    inputId,
    schema,
    scalarControl.control,
    scalarControl.useSpanLabel,
    cycleButton,
    path,
  );
}

function renderScalarControl(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: ScalarControlOptions,
): ScalarControlResult {
  if (schema.const !== undefined) {
    return {
      control: html`<output id=${options.inputId}>${String(schema.const)}</output>`,
      useSpanLabel: true,
      multiline: false,
      isBoolean: false,
    };
  }

  if (schema.enum?.length) {
    const optionsList = schema.enum ?? [];
    const normalizedValue =
      value !== undefined && optionsList.includes(value as never)
        ? String(value)
        : String(optionsList[0] ?? "");

    return {
      control: html`
        <select
          id=${options.inputId}
          .disabled=${options.disabled}
          .value=${normalizedValue}
          ?required=${options.required}
          aria-invalid=${options.invalid ? "true" : "false"}
          aria-describedby=${ifDefined(options.describedBy)}
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
      `,
      useSpanLabel: false,
      multiline: false,
      isBoolean: false,
    };
  }

  if (acceptsType(schema, "boolean")) {
    return {
      control: html`
        <label class="lipstick-switch" for=${options.inputId}>
          <input
            id=${options.inputId}
            type="checkbox"
            .disabled=${options.disabled}
            .checked=${value === true}
            aria-invalid=${options.invalid ? "true" : "false"}
            aria-describedby=${ifDefined(options.describedBy)}
            @change=${(event: Event) =>
              updatePathValue(ctx, path, (event.target as HTMLInputElement).checked, schema, true)}
          />
          <span class="lipstick-switch-track" aria-hidden="true">
            <span class="lipstick-switch-thumb"></span>
          </span>
        </label>
      `,
      useSpanLabel: false,
      multiline: false,
      isBoolean: true,
    };
  }

  if (acceptsType(schema, "integer") || acceptsType(schema, "number")) {
    const numericValue =
      typeof value === "number" ? value : typeof schema.minimum === "number" ? schema.minimum : 0;
    const step = getNumericInputStep(schema);
    const formattedValue = formatNumericValue(numericValue, step);

    if (typeof schema.minimum === "number" && typeof schema.maximum === "number") {
      return {
        control: html`
          <div class="lipstick-range-controls">
            <div class="lipstick-range-main">
              <input
                id=${options.inputId}
                type="range"
                .disabled=${options.disabled}
                .min=${String(schema.minimum)}
                .max=${String(schema.maximum)}
                .step=${String(step)}
                .value=${String(numericValue)}
                aria-invalid=${options.invalid ? "true" : "false"}
                aria-describedby=${ifDefined(options.describedBy)}
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
              id=${`${options.inputId}-manual`}
              class="lipstick-range-number"
              type="number"
              .disabled=${options.disabled}
              .min=${String(schema.minimum)}
              .max=${String(schema.maximum)}
              .step=${String(step)}
              .value=${formattedValue}
              ?required=${options.required}
              aria-invalid=${options.invalid ? "true" : "false"}
              aria-describedby=${ifDefined(options.describedBy)}
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
        `,
        useSpanLabel: false,
        multiline: false,
        isBoolean: false,
      };
    }

    return {
      control: html`
        <input
          id=${options.inputId}
          type="number"
          .disabled=${options.disabled}
          .step=${String(step)}
          .value=${typeof value === "number" ? formattedValue : ""}
          ?required=${options.required}
          aria-invalid=${options.invalid ? "true" : "false"}
          aria-describedby=${ifDefined(options.describedBy)}
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
      `,
      useSpanLabel: false,
      multiline: false,
      isBoolean: false,
    };
  }

  if (acceptsType(schema, "null")) {
    return {
      control: html`<code id=${options.inputId} class="lipstick-null-value">null</code>`,
      useSpanLabel: true,
      multiline: false,
      isBoolean: false,
    };
  }

  const multiline =
    schema.format === "textarea" ||
    (typeof schema.maxLength === "number" && schema.maxLength > 200);
  const inputType = getStringInputType(schema);
  const isDateTimeInput = inputType === "datetime-local";
  const currentValue =
    typeof value === "string" ? (isDateTimeInput ? formatDateTimeForInput(value) : value) : "";
  const control = multiline
    ? html`
        <textarea
          id=${options.inputId}
          placeholder="Enter a value"
          .disabled=${options.disabled}
          .value=${currentValue}
          ?required=${options.required}
          aria-invalid=${options.invalid ? "true" : "false"}
          aria-describedby=${ifDefined(options.describedBy)}
          @input=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, false)}
          @change=${(event: Event) =>
            updatePathValue(ctx, path, (event.target as HTMLTextAreaElement).value, schema, true)}
        ></textarea>
      `
    : html`
        <input
          id=${options.inputId}
          type=${inputType}
          placeholder="Enter a value"
          .disabled=${options.disabled}
          .value=${currentValue}
          step=${ifDefined(isDateTimeInput ? "60" : undefined)}
          ?required=${options.required}
          aria-invalid=${options.invalid ? "true" : "false"}
          aria-describedby=${ifDefined(options.describedBy)}
          @input=${(event: Event) => {
            const rawValue = (event.target as HTMLInputElement).value;
            const nextValue = isDateTimeInput ? normalizeDateTimeFromInput(rawValue) : rawValue;
            updatePathValue(ctx, path, nextValue, schema, false);
          }}
          @change=${(event: Event) => {
            const rawValue = (event.target as HTMLInputElement).value;
            const nextValue = isDateTimeInput ? normalizeDateTimeFromInput(rawValue) : rawValue;
            updatePathValue(ctx, path, nextValue, schema, true);
          }}
        />
      `;

  return {
    control,
    useSpanLabel: false,
    multiline,
    isBoolean: false,
  };
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
  const renderCycleAndSelect = (
    selectedIndex: number,
    options: Array<{ index: number; label: string }>,
  ): TemplateResult => html`
    <div class="lipstick-union-picker">
      <button
        type="button"
        class="lipstick-cycle"
        ?disabled=${ctx.formDisabled}
        @click=${() => changeBranch((selectedIndex + 1) % options.length)}
        aria-label="Cycle variant"
      >
        ⇄
      </button>
      <select
        .disabled=${ctx.formDisabled}
        .value=${String(selectedIndex)}
        @change=${(event: Event) => changeBranch(Number((event.target as HTMLSelectElement).value))}
      >
        ${options.map(
          (option) => html` <option value=${String(option.index)}>${option.label}</option> `,
        )}
      </select>
    </div>
  `;

  if (schema.anyOf?.length && union.kind !== "discriminator") {
    return renderCycleAndSelect(union.selectedIndex, union.options);
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
    return renderCycleAndSelect(union.selectedIndex, union.options);
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
    return body;
  }

  return renderFramedFieldset(ctx, schema, options, path, value, body);
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
    ${propertyEntries.map(([key, childSchema]) => {
      const required = requiredSet.has(key);
      const present = required || key in objectValue;

      return renderNode(ctx, childSchema, objectValue[key], [...path, key], {
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
      renderNode(ctx, getAdditionalPropertySchema(schema), objectValue[key], [...path, key], {
        label: humanizeLabel(key),
        required: false,
        present: true,
        framed: true,
        collapsible: canCollapseSchema(ctx, getAdditionalPropertySchema(schema)),
        onRemove: () => removeProperty(ctx, [...path, key]),
      }),
    )}
    ${schema.additionalProperties !== false
      ? renderAdditionalPropertyComposer(ctx, schema, path)
      : nothing}
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
    <p data-lipstick-composer>
      <span>
        <button
          type="button"
          class="lipstick-add"
          ?disabled=${ctx.formDisabled || !canAdd || !draft.trim()}
          @click=${() => addAdditionalProperty(ctx, path, draft.trim(), schema)}
          aria-label="Add new property"
        >
          <span aria-hidden="true">+</span>
        </button>
      </span>
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
    </p>
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
  const arrayRules = getArrayMutationRules(schema, arrayValue.length);
  const body = renderArrayBody(
    ctx,
    schema,
    arrayValue,
    path,
    arrayRules.nextIndex,
    (getArrayItemSchema(schema, arrayRules.nextIndex) ?? {}).title,
    arrayRules.canAdd,
  );

  const framed = options.framed ?? true;

  if (!framed) {
    return body;
  }

  return renderFramedFieldset(ctx, schema, options, path, value, body);
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
    <section>
      ${arrayValue.map((item, index) => renderArrayItem(ctx, schema, item, path, index))}
    </section>
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
  const resolvedItemSchema = resolveSchema(itemSchema, ctx.rootSchema, item);
  const prefixItemsLength = schema.prefixItems?.length ?? 0;
  const arrayValue = getValueAtPath(ctx.value, path);
  const arrayLength = Array.isArray(arrayValue) ? arrayValue.length : 0;
  const arrayRules = getArrayMutationRules(schema, arrayLength);
  const canRemove = arrayRules.canRemoveAny;
  const showRemoveAction = arrayRules.canMutate;
  const canMoveUp = index > prefixItemsLength;
  const canMoveDown =
    Array.isArray(arrayValue) && index >= prefixItemsLength && index < arrayValue.length - 1;
  const isSimpleItem = isSimpleArrayItemSchema(ctx, resolvedItemSchema);
  const simpleItemLabel = formatSimpleArrayItemLabel(resolvedItemSchema, index);
  const objectItemLabel = formatObjectArrayItemLabel(resolvedItemSchema, index);

  if (isSimpleItem) {
    return html`
      <article data-lipstick-simple-array-item>
        ${renderNode(ctx, itemSchema, item, itemPath, {
          label: simpleItemLabel ?? "",
          required: index < (schema.minItems ?? 0),
          present: true,
          framed: false,
          collapsible: false,
          deferValidationMessage: true,
          onRemove: undefined,
        })}
        <nav class="lipstick-actions" aria-label="Array item actions">
          ${renderArrayItemReorderActions(
            ctx,
            path,
            index,
            canMoveUp,
            canMoveDown,
            prefixItemsLength,
          )}
          ${showRemoveAction ? renderArrayItemRemoveAction(ctx, itemPath, canRemove) : nothing}
        </nav>
        ${renderValidationMessages(ctx, itemPath, itemSchema, item)}
      </article>
    `;
  }

  return html`
    <article>
      ${renderNode(ctx, itemSchema, item, itemPath, {
        label: objectItemLabel,
        required: index < (schema.minItems ?? 0),
        present: true,
        framed: true,
        collapsible: false,
        headerPrefix: html`${renderArrayItemReorderActions(
          ctx,
          path,
          index,
          canMoveUp,
          canMoveDown,
          prefixItemsLength,
        )}`,
        removeLabel: "Delete array item",
        removeDisabled: !canRemove,
        onRemove: showRemoveAction ? () => removeArrayItem(ctx, itemPath) : undefined,
      })}
    </article>
  `;
}

function renderScalarField(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  path: JsonPointerPath,
  options: FieldRenderOptions,
): TemplateResult {
  const fieldLabel = options.label ?? schema.title ?? "Value";
  const inputId = createInputId(ctx, path);
  const disabled = ctx.formDisabled || schema.readOnly === true;
  const messages = getFieldMessages(ctx, path, schema, value);
  const invalid = messages.length > 0;
  const control = renderScalarControl(ctx, schema, value, path, {
    inputId,
    disabled,
    required: options.required,
    invalid,
    describedBy: getControlDescribedBy(ctx, schema, path, value),
  });
  const inlineSimpleValue = !schema.description && !control.isBoolean && !control.multiline;

  if (inlineSimpleValue) {
    return renderInlineSimpleField(
      ctx,
      fieldLabel,
      options,
      inputId,
      schema,
      control.control,
      control.useSpanLabel,
      nothing,
      path,
    );
  }

  if (control.isBoolean) {
    return renderInlineSimpleField(
      ctx,
      fieldLabel,
      options,
      inputId,
      schema,
      control.control,
      control.useSpanLabel,
      nothing,
      path,
    );
  }

  return html`
    <section>
      ${renderLeafHeader(ctx, fieldLabel, options, path)}
      <div>${renderLeafBody(ctx, schema, path)} ${control.control}</div>
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
    return html` <legend>${renderOptionalAddTrigger(ctx, text, options.onAdd)}</legend> `;
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
              <span aria-hidden="true"> ${collapsed ? "+" : "−"} </span>
            </button>
          `}
      ${options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
        : nothing}
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
          ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
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
        <span aria-hidden="true"> ${collapsed ? "+" : "−"} </span>
      </button>
      ${options.present && options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
        : nothing}
    </header>
  `;
}

function renderDescription(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
  id?: string,
): TemplateResult | typeof nothing {
  void ctx;
  void path;
  return schema.description ? html`<p id=${ifDefined(id)}>${schema.description}</p>` : nothing;
}

function renderRefWarning(schema: JsonSchema202012, id?: string): TemplateResult | typeof nothing {
  const refError = getRefError(schema);
  return refError ? html`<p id=${ifDefined(id)}>${refError}</p>` : nothing;
}

function renderValidationMessages(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  schema?: JsonSchema202012,
  value?: JsonValue | undefined,
  id?: string,
): TemplateResult | typeof nothing {
  const messages = getFieldMessages(ctx, path, schema, value);
  if (messages.length === 0) {
    return nothing;
  }

  return html` <p id=${ifDefined(id)} role="alert">${messages.join(" ")}</p> `;
}

function renderFramedFieldset(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  options: FieldRenderOptions,
  path: JsonPointerPath,
  value: JsonValue | undefined,
  content: TemplateResult,
): TemplateResult {
  const collapsed = isCollapsed(ctx, path);
  const shouldCollapse = options.collapsible !== false && collapsed;

  return html`
    <fieldset ?data-collapsed=${shouldCollapse}>
      ${renderFieldsetHeader(ctx, schema, options, path, collapsed)}
      <div>
        ${renderDescription(ctx, schema, path)} ${renderRefWarning(schema)}
        ${renderValidationMessages(ctx, path, schema, value)} ${content}
      </div>
    </fieldset>
  `;
}

function getFieldMessages(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  schema?: JsonSchema202012,
  value?: JsonValue | undefined,
): string[] {
  if (schema) {
    const resolved = resolveSchema(schema, ctx.rootSchema, value);
    const branches = resolved.oneOf ?? resolved.anyOf;

    if (branches?.length) {
      const key = pathToKey(path);
      const selectedIndex =
        ctx.branchSelections.get(key) ??
        describeUnion(resolved, value, ctx.rootSchema)?.selectedIndex ??
        0;
      const boundedIndex = Math.max(0, Math.min(selectedIndex, branches.length - 1));
      const selectedBranch = resolveSchema(branches[boundedIndex], ctx.rootSchema, value);
      return getFieldMessagesForSchema(selectedBranch, value).get("#") ?? [];
    }
  }

  return ctx.validation.fieldMessages.get(pathToKey(path)) ?? [];
}

function getControlDescribedBy(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
  value: JsonValue | undefined,
): string | undefined {
  const describedByIds: string[] = [];
  const inputId = createInputId(ctx, path);
  if (schema.description) {
    describedByIds.push(`${inputId}-description`);
  }
  if (getRefError(schema)) {
    describedByIds.push(`${inputId}-ref-error`);
  }
  if (getFieldMessages(ctx, path, schema, value).length > 0) {
    describedByIds.push(`${inputId}-validation`);
  }
  return describedByIds.length > 0 ? describedByIds.join(" ") : undefined;
}

function renderLeafBody(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
): TemplateResult | typeof nothing {
  const inputId = createInputId(ctx, path);
  return html`
    ${renderDescription(ctx, schema, path, `${inputId}-description`)}
    ${renderRefWarning(schema, `${inputId}-ref-error`)}
    ${renderValidationMessages(
      ctx,
      path,
      schema,
      getValueAtPath(ctx.value, path),
      `${inputId}-validation`,
    )}
  `;
}

function renderLeafMeta(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema202012,
  path: JsonPointerPath,
): TemplateResult | typeof nothing {
  const inputId = createInputId(ctx, path);
  return html`
    ${renderDescription(ctx, schema, path, `${inputId}-description`)}
    ${renderRefWarning(schema, `${inputId}-ref-error`)}
  `;
}

function formatSimpleArrayItemLabel(schema: JsonSchema202012, index: number): string | undefined {
  const title = schema.title?.trim();
  return title ? `${title} ${index + 1}` : undefined;
}

function formatObjectArrayItemLabel(schema: JsonSchema202012, index: number): string {
  const title = schema.title?.trim() || "Item";
  return `${title} ${index + 1}`;
}

function getArrayMutationRules(schema: JsonSchema202012, arrayLength: number): ArrayMutationRules {
  const nextIndex = arrayLength;
  const prefixItemsLength = schema.prefixItems?.length ?? 0;
  const withinMaxItems = schema.maxItems === undefined || nextIndex < schema.maxItems;
  const canAdd = withinMaxItems && (schema.items !== false || nextIndex < prefixItemsLength);
  const canRemoveAny = arrayLength > (schema.minItems ?? 0);
  return {
    nextIndex,
    canAdd,
    canRemoveAny,
    canMutate: canAdd || canRemoveAny,
  };
}

function renderArrayItemReorderActions(
  ctx: JsonSchemaFormContext,
  path: JsonPointerPath,
  index: number,
  canMoveUp: boolean,
  canMoveDown: boolean,
  prefixItemsLength: number,
): TemplateResult | typeof nothing {
  if (!canMoveUp && !canMoveDown) {
    return nothing;
  }

  return html`
    <button
      type="button"
      class="lipstick-move-up"
      ?disabled=${ctx.formDisabled || !canMoveUp}
      @click=${() => reorderArrayItem(ctx, path, index, index - 1, prefixItemsLength)}
      aria-label="Move item up"
    >
      ↑
    </button>
    <button
      type="button"
      class="lipstick-move-down"
      ?disabled=${ctx.formDisabled || !canMoveDown}
      @click=${() => reorderArrayItem(ctx, path, index, index + 1, prefixItemsLength)}
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
  disabled = false,
): TemplateResult {
  return html`
    <button
      type="button"
      class="lipstick-remove"
      ?disabled=${ctx.formDisabled || disabled}
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
  path: JsonPointerPath = [],
): TemplateResult {
  const hasLabel = Boolean(label.trim());
  const controls = html`
    ${afterControl}
    ${options.present && options.onRemove
      ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
      : nothing}
  `;

  return html`
    <div data-lipstick-inline>
      ${hasLabel
        ? useSpanLabel
          ? html`<span>${label}</span>`
          : html`<label for=${inputId}>${label}</label>`
        : nothing}
      ${control}
      ${afterControl !== nothing || (options.present && options.onRemove)
        ? html`<nav class="lipstick-actions" aria-label="Field controls">${controls}</nav>`
        : nothing}
      ${renderLeafMeta(ctx, schema, path)}
    </div>
    ${options.deferValidationMessage
      ? nothing
      : renderValidationMessages(
          ctx,
          path,
          schema,
          getValueAtPath(ctx.value, path),
          `${inputId}-validation`,
        )}
  `;
}
