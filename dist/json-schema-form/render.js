import { html, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { acceptsType, describeUnion, getArrayItemSchema, getRequiredProperties, humanizeLabel, isArraySchema, isObjectSchema, jsonValueEquals, pathToKey, resolveSchema, } from "../lib/schema.js";
import { formatDateTimeForInput, formatNumericValue, getNumericInputStep, getStringInputType, normalizeDateTimeFromInput, parseNumericInputValue, } from "../lib/input.js";
import { getValueAtPath, isJsonObject } from "../lib/value.js";
import { getFieldMessagesForSchema } from "../lib/validation.js";
import { addAdditionalProperty, addArrayItem, addKnownProperty, canAddAdditionalProperty, canCollapseSchema, createInputId, getAdditionalPropertySchema, isCollapsed, isSimpleArrayItemSchema, parseLiteralOption, reorderArrayItem, resetRootValue, removeArrayItem, removeProperty, switchUnionBranch, toggleCollapsed, updatePathValue, } from "./state.js";
import { copyRootValueToClipboard, pasteRootValueFromClipboard } from "./clipboard.js";
export function renderForm(ctx) {
    if (!ctx.schema) {
        return nothing;
    }
    if (ctx.validation.schemaError) {
        return html `<p role="alert">${ctx.validation.schemaError}</p>`;
    }
    const schema = resolveSchema(ctx.rootSchema, ctx.rootSchema, ctx.value);
    return html `
    ${renderNode(ctx, schema, ctx.value, [], {
        required: true,
        present: true,
        framed: true,
        collapsible: false,
    })}
    ${ctx.name?.trim()
        ? html `<input type="hidden" name=${ctx.name.trim()} .value=${JSON.stringify(ctx.value ?? null)} />`
        : nothing}
  `;
}
function renderNode(ctx, schema, value, path, options) {
    const rootSchema = ctx.rootSchema;
    const resolved = resolveSchema(schema, rootSchema, value);
    const union = describeUnion(resolved, value, rootSchema, ctx.branchSelections.get(pathToKey(path)));
    if (!options.present) {
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
function renderCollapsedOptionalField(ctx, schema, path, options) {
    const label = options.label ?? schema.title ?? "Field";
    return html `
    <section>${renderLeafHeader(ctx, label, { ...options, collapsible: false }, path)}</section>
  `;
}
function renderUnionField(ctx, schema, value, path, options, union) {
    const rootSchema = ctx.rootSchema;
    const branches = schema.oneOf ?? schema.anyOf ?? [];
    const branchSchema = resolveSchema(branches[union.selectedIndex], rootSchema, value);
    const changeBranch = (index) => {
        switchUnionBranch(ctx, path, value, branches, index);
    };
    return renderFramedFieldset(ctx, schema, options, path, value, html `
      ${renderUnionSelector(ctx, union, changeBranch)}
      ${branchSchema.type === "null" ? nothing : renderUnionBranch(ctx, branchSchema, value, path)}
    `);
}
function isCycledPrimitiveUnion(schema, rootSchema) {
    const branches = schema.anyOf ?? [];
    return (branches.length > 1 &&
        branches.every((branch) => {
            const resolved = resolveSchema(branch, rootSchema, undefined);
            return !isObjectSchema(resolved) && !isArraySchema(resolved);
        }));
}
function renderPrimitiveUnionField(ctx, schema, value, path, options, union) {
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
    const cycleButton = branches.length > 1
        ? html `<button
          type="button"
          class="lipstick-cycle"
          ?disabled=${ctx.formDisabled}
          @click=${() => switchUnionBranch(ctx, path, value, branches, (union.selectedIndex + 1) % branches.length)}
          aria-label="Cycle variant"
        >
          ⇄
        </button>`
        : nothing;
    const fieldLabel = options.label ?? schema.title ?? "";
    if (!schema.description) {
        return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, scalarControl, cycleButton, path);
    }
    const removeButton = options.present && options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
        : nothing;
    return html `
    <section>
      <header>
        <span>${fieldLabel}</span>
        ${cycleButton}${removeButton}
      </header>
      <div>
        ${renderDescription(ctx, schema, path)} ${scalarControl}
        ${renderValidationMessages(ctx, path, schema, getValueAtPath(ctx.value, path))}
      </div>
    </section>
  `;
}
function renderScalarControl(ctx, schema, value, path, options) {
    const isNull = acceptsType(schema, "null");
    if (isNull || schema.const !== undefined) {
        return html `<input
      id=${options.inputId}
      type="text"
      .value=${String(schema.const ?? null)}
      readonly
      ?data-null=${isNull}
    />`;
    }
    if (schema.enum?.length) {
        const optionsList = schema.enum ?? [];
        const optionLabels = getEnumOptionLabels(optionsList);
        const selectedIndex = value === undefined ? 0 : Math.max(0, optionsList.findIndex((option) => jsonValueEquals(option, value)));
        return html `
      <select
        id=${options.inputId}
        .disabled=${options.disabled}
        .value=${String(selectedIndex)}
        ?required=${options.required}
        aria-invalid=${options.invalid ? "true" : "false"}
        aria-describedby=${ifDefined(options.describedBy)}
        @change=${(event) => {
            const nextValue = parseLiteralOption(event.target.value, optionsList);
            updatePathValue(ctx, path, nextValue, schema, true);
        }}
      >
        ${optionsList.map((option, index) => html `<option value=${String(index)}>${optionLabels[index] ?? String(option)}</option>`)}
      </select>
    `;
    }
    if (acceptsType(schema, "boolean")) {
        return html `
      <input
        id=${options.inputId}
        type="checkbox"
        .disabled=${options.disabled}
        .checked=${value === true}
        aria-invalid=${options.invalid ? "true" : "false"}
        aria-describedby=${ifDefined(options.describedBy)}
        @change=${(event) => updatePathValue(ctx, path, event.target.checked, schema, true)}
      />
    `;
    }
    if (acceptsType(schema, "integer") || acceptsType(schema, "number")) {
        const numericValue = typeof value === "number" ? value : typeof schema.minimum === "number" ? schema.minimum : 0;
        const step = getNumericInputStep(schema);
        const formattedValue = formatNumericValue(numericValue, step);
        if (typeof schema.minimum === "number" && typeof schema.maximum === "number") {
            return renderScalarControlRange(ctx, schema, path, options, step, numericValue, formattedValue);
        }
        return html `
      <input
        id=${options.inputId}
        type="number"
        .disabled=${options.disabled}
        .step=${String(step)}
        .value=${getNumericDisplayValue(options.inputId, typeof value === "number" ? formattedValue : "")}
        ?required=${options.required}
        aria-invalid=${options.invalid ? "true" : "false"}
        aria-describedby=${ifDefined(options.describedBy)}
        @input=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "input")}
        @change=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
        @blur=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
      />
    `;
    }
    const inputType = getStringInputType(schema);
    const isDateTimeInput = inputType === "datetime-local";
    const currentValue = typeof value === "string" ? (isDateTimeInput ? formatDateTimeForInput(value) : value) : "";
    return html `
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
      @input=${(event) => {
        const rawValue = event.target.value;
        const nextValue = isDateTimeInput ? normalizeDateTimeFromInput(rawValue) : rawValue;
        updatePathValue(ctx, path, nextValue, schema, false);
    }}
      @change=${(event) => {
        const rawValue = event.target.value;
        const nextValue = isDateTimeInput ? normalizeDateTimeFromInput(rawValue) : rawValue;
        updatePathValue(ctx, path, nextValue, schema, true);
    }}
    />
  `;
}
function renderScalarControlRange(ctx, schema, path, options, step, numericValue, formattedValue) {
    return html `
    <div class="lipstick-range-component">
      <div class="lipstick-range-slider">
        <input
          id=${options.inputId}
          type="range"
          .disabled=${options.disabled}
          .min=${String(schema.minimum)}
          .max=${String(schema.maximum)}
          .step=${String(step)}
          .value=${getNumericDisplayValue(options.inputId, String(numericValue))}
          aria-invalid=${options.invalid ? "true" : "false"}
          aria-describedby=${ifDefined(options.describedBy)}
          @input=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "input")}
          @change=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
          @blur=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
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
        .value=${getNumericDisplayValue(`${options.inputId}-manual`, formattedValue)}
        ?required=${options.required}
        aria-invalid=${options.invalid ? "true" : "false"}
        aria-describedby=${ifDefined(options.describedBy)}
        @input=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "input")}
        @change=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
        @blur=${(event) => handleNumericFieldEvent(ctx, path, schema, event.target, "commit")}
      />
    </div>
  `;
}
function handleNumericFieldEvent(ctx, path, schema, input, mode) {
    const parsed = tryParseNumericInput(input);
    if (parsed === undefined) {
        setNumericLocalParseError(ctx, input, true);
        return;
    }
    setNumericLocalParseError(ctx, input, false);
    updatePathValue(ctx, path, parsed, schema, mode === "commit");
}
function tryParseNumericInput(input) {
    const raw = input.value.trim();
    if (raw.length === 0 || input.validity.badInput) {
        return undefined;
    }
    const parsed = parseNumericInputValue(input);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function setNumericLocalParseError(ctx, input, hasError) {
    const current = input.dataset.parseError === "true";
    if (current === hasError) {
        return;
    }
    if (hasError) {
        input.dataset.parseError = "true";
    }
    else {
        delete input.dataset.parseError;
    }
    ctx.requestUpdate?.();
}
function getNumericDisplayValue(inputId, fallbackValue) {
    const active = globalThis.document?.activeElement;
    if (active instanceof HTMLInputElement && active.id === inputId) {
        return active.value;
    }
    return fallbackValue;
}
function renderUnionBranch(ctx, branchSchema, value, path) {
    return renderNode(ctx, branchSchema, value, path, {
        required: true,
        present: true,
        framed: false,
        collapsible: false,
    });
}
function renderUnionSelector(ctx, union, changeBranch) {
    const renderCycleAndSelect = (selectedIndex, options) => html `
    <div class="lipstick-union-picker">
      <button
        type="button"
        class="lipstick-cycle"
        ?disabled=${ctx.formDisabled}
        @click=${() => changeBranch((selectedIndex + 1) % options.length)}
        aria-label="Cycle variant"
      >
        ⇄</button
      ><select
        .disabled=${ctx.formDisabled}
        .value=${String(selectedIndex)}
        @change=${(event) => changeBranch(Number(event.target.value))}
      >
        ${options.map((option) => html ` <option value=${String(option.index)}>${option.label}</option> `)}
      </select>
    </div>
  `;
    if (union.kind === "generic") {
        return renderCycleAndSelect(union.selectedIndex, union.options);
    }
    return html `
    <div role="radiogroup">
      ${union.options.map((option) => html `
          <button
            type="button"
            aria-pressed=${(option.index === union.selectedIndex).toString()}
            ?disabled=${ctx.formDisabled}
            @click=${() => changeBranch(option.index)}
          >
            ${option.literal ?? option.label}
          </button>
        `)}
    </div>
  `;
}
function renderObjectField(ctx, schema, value, path, options) {
    const objectValue = isJsonObject(value) ? value : {};
    const properties = schema.properties ?? {};
    const requiredSet = getRequiredProperties(schema, objectValue);
    const propertyEntries = Object.entries(properties);
    const additionalKeys = Object.keys(objectValue).filter((key) => !(key in properties));
    const body = renderObjectBody(ctx, schema, objectValue, path, propertyEntries, requiredSet, additionalKeys);
    const framed = options.framed ?? true;
    if (!framed) {
        return body;
    }
    return renderFramedFieldset(ctx, schema, options, path, value, body);
}
function renderObjectBody(ctx, schema, objectValue, path, propertyEntries, requiredSet, additionalKeys) {
    return html `
    ${propertyEntries.map(([key, childSchema]) => {
        const required = requiredSet.has(key);
        const present = key in objectValue;
        return renderNode(ctx, childSchema, objectValue[key], [...path, key], {
            label: childSchema.title ?? humanizeLabel(key),
            required,
            present,
            framed: true,
            collapsible: canCollapseSchema(ctx, childSchema),
            onAdd: present ? undefined : () => addKnownProperty(ctx, path, key, childSchema),
            onRemove: required || !present ? undefined : () => removeProperty(ctx, [...path, key]),
        });
    })}
    ${additionalKeys.map((key) => renderNode(ctx, getAdditionalPropertySchema(schema), objectValue[key], [...path, key], {
        label: humanizeLabel(key),
        required: false,
        present: true,
        framed: true,
        collapsible: canCollapseSchema(ctx, getAdditionalPropertySchema(schema)),
        onRemove: () => removeProperty(ctx, [...path, key]),
    }))}
    ${schema.additionalProperties ? renderAdditionalPropertyComposer(ctx, schema, path) : nothing}
  `;
}
function renderAdditionalPropertyComposer(ctx, schema, path) {
    const canAdd = canAddAdditionalProperty(schema);
    if (!canAdd) {
        return nothing;
    }
    const commitFromInput = (input) => {
        const key = input.value.trim();
        addAdditionalProperty(ctx, path, key, schema);
        if (key) {
            input.value = "";
        }
    };
    return html `
    <p data-lipstick-composer>
      <span>
        <button
          type="button"
          class="lipstick-add"
          ?disabled=${ctx.formDisabled || !canAdd}
          @click=${(event) => {
        const input = event.currentTarget.closest("[data-lipstick-composer]")?.querySelector("input");
        if (input instanceof HTMLInputElement) {
            commitFromInput(input);
        }
    }}
          aria-label="Add new property"
        >
          <span aria-hidden="true">+</span>
        </button></span
      ><input
        type="text"
        placeholder="add new property"
        .disabled=${ctx.formDisabled || !canAdd}
        @keydown=${(event) => {
        if (event.key !== "Enter") {
            return;
        }
        event.preventDefault();
        commitFromInput(event.currentTarget);
    }}
      />
    </p>
  `;
}
function renderArrayField(ctx, schema, value, path, options) {
    const arrayValue = Array.isArray(value) ? value : [];
    const arrayRules = getArrayMutationRules(schema, arrayValue.length);
    const body = renderArrayBody(ctx, schema, arrayValue, path, arrayRules.nextIndex, (getArrayItemSchema(schema, arrayRules.nextIndex) ?? {}).title, arrayRules.canAdd);
    const framed = options.framed ?? true;
    if (!framed) {
        return body;
    }
    return renderFramedFieldset(ctx, schema, options, path, value, body);
}
function renderArrayBody(ctx, schema, arrayValue, path, nextIndex, addLabel, canAdd) {
    return html ` ${arrayValue.length > 0
        ? html `<section>
        ${arrayValue.map((item, index) => renderArrayItem(ctx, schema, item, path, index))}
      </section>`
        : nothing}
  ${canAdd
        ? html `<button
        type="button"
        class="lipstick-add"
        ?disabled=${ctx.formDisabled}
        aria-label=${addLabel ? `Add ${addLabel}` : "Add item"}
        @click=${() => addArrayItem(ctx, path, schema, nextIndex)}
      >
        +
      </button>`
        : nothing}`;
}
function renderArrayItem(ctx, schema, item, path, index) {
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
    const canMoveDown = Array.isArray(arrayValue) && index >= prefixItemsLength && index < arrayValue.length - 1;
    const isSimpleItem = isSimpleArrayItemSchema(ctx, resolvedItemSchema);
    const simpleItemLabel = formatSimpleArrayItemLabel(resolvedItemSchema, index);
    const objectItemLabel = getArrayObjectItemLabel(resolvedItemSchema, item, index);
    const reorderActions = renderArrayItemReorderActions(ctx, path, index, canMoveUp, canMoveDown, prefixItemsLength);
    if (isSimpleItem) {
        const inlineActions = reorderActions !== nothing || showRemoveAction
            ? html `${reorderActions}${showRemoveAction
                ? renderArrayItemRemoveAction(ctx, itemPath, canRemove)
                : nothing}`
            : undefined;
        return html `
      <article data-lipstick-simple-array-item>
        ${renderNode(ctx, itemSchema, item, itemPath, {
            label: simpleItemLabel ?? "",
            required: index < (schema.minItems ?? 0),
            present: true,
            framed: false,
            collapsible: false,
            inlineActions,
            deferValidationMessage: true,
            onRemove: undefined,
        })}
        ${renderValidationMessages(ctx, itemPath, itemSchema, item)}
      </article>
    `;
    }
    return html `
    <article>
      ${renderNode(ctx, itemSchema, item, itemPath, {
        label: objectItemLabel,
        required: index < (schema.minItems ?? 0),
        present: true,
        framed: true,
        collapsible: canCollapseSchema(ctx, resolvedItemSchema),
        headerSuffix: html `<nav class="lipstick-actions" aria-label="Item controls">
          ${reorderActions}
          ${showRemoveAction ? renderArrayItemRemoveAction(ctx, itemPath, canRemove) : nothing}
        </nav>`,
    })}
    </article>
  `;
}
function renderScalarField(ctx, schema, value, path, options) {
    const fieldLabel = options.label ?? schema.title ?? "";
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
    if (!schema.description) {
        return renderInlineSimpleField(ctx, fieldLabel, options, inputId, schema, control, options.inlineActions ?? nothing, path);
    }
    return html `
    <section>
      ${renderLeafHeader(ctx, fieldLabel, { ...options, collapsible: false }, path)}
      ${renderDescription(ctx, schema, path)} ${control}
      ${renderValidationMessages(ctx, path, schema, getValueAtPath(ctx.value, path))}
    </section>
  `;
}
function renderFieldsetHeader(ctx, schema, options, path, collapsed) {
    const text = options.label ?? schema.title;
    if (!text) {
        return nothing;
    }
    if (!options.present && options.onAdd) {
        return html `
      <legend>${renderOptionalAddTrigger(ctx, text, options.onAdd, options.required)}</legend>
    `;
    }
    const rootActions = path.length === 0
        ? html `<nav class="lipstick-actions" aria-label="Form controls">
          <button
            type="button"
            class="lipstick-copy"
            @click=${(event) => copyRootValueToClipboard(ctx, event)}
            title="Copy"
            aria-label="Copy form value"
          >
            ◰
          </button>
          <button
            type="button"
            class="lipstick-paste"
            ?disabled=${ctx.formDisabled}
            @click=${(event) => pasteRootValueFromClipboard(ctx, event)}
            title="Paste"
            aria-label="Paste form value"
          >
            ↴
          </button>
          <button
            type="button"
            class="lipstick-reset"
            ?disabled=${ctx.formDisabled}
            @click=${(event) => {
            event.preventDefault();
            event.stopPropagation();
            resetRootValue(ctx);
        }}
            title="Reset"
            aria-label="Reset form value"
          >
            ↺
          </button>
        </nav>`
        : nothing;
    return html `
    <legend>
      ${options.collapsible === false
        ? html `<span>${text}</span>${rootActions}`
        : html `
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
      ${options.headerSuffix ?? nothing}
      ${options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
        : nothing}
    </legend>
  `;
}
function renderLeafHeader(ctx, label, options, path) {
    const collapsed = isCollapsed(ctx, path);
    if (!options.present && options.onAdd) {
        return renderOptionalAddTrigger(ctx, label, options.onAdd, options.required);
    }
    if (options.collapsible === false) {
        return html `
      <header>
        <span>${label}</span>
        ${options.present && options.onRemove
            ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
            : nothing}
      </header>
    `;
    }
    return html `
    <header>
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
function renderDescription(ctx, schema, path) {
    void ctx;
    void path;
    return schema.description ? html `<p>${schema.description}</p>` : nothing;
}
function renderValidationMessages(ctx, path, schema, value) {
    const localNumericError = getLocalNumericParseError(ctx, path);
    if (localNumericError) {
        return html ` <p role="alert">${localNumericError}</p> `;
    }
    const messages = getFieldMessages(ctx, path, schema, value);
    if (messages.length === 0) {
        return nothing;
    }
    return html ` <p role="alert">${messages.join(" ")}</p> `;
}
function renderFramedFieldset(ctx, schema, options, path, value, content) {
    const collapsed = isCollapsed(ctx, path);
    const shouldCollapse = options.collapsible !== false && collapsed;
    const isUnionContainer = Boolean(schema.oneOf?.length || schema.anyOf?.length);
    return html `
    <fieldset ?data-collapsed=${shouldCollapse}>
      ${renderFieldsetHeader(ctx, schema, options, path, collapsed)}
      <div>
        ${renderDescription(ctx, schema, path)}
        ${isUnionContainer ? nothing : renderValidationMessages(ctx, path, schema, value)}
        ${content}
      </div>
    </fieldset>
  `;
}
function getFieldMessages(ctx, path, schema, value) {
    if (schema) {
        const resolved = resolveSchema(schema, ctx.rootSchema, value);
        const branches = resolved.oneOf ?? resolved.anyOf;
        if (branches?.length) {
            const key = pathToKey(path);
            const selectedIndex = ctx.branchSelections.get(key) ??
                describeUnion(resolved, value, ctx.rootSchema)?.selectedIndex ??
                0;
            const boundedIndex = Math.max(0, Math.min(selectedIndex, branches.length - 1));
            const selectedBranch = resolveSchema(branches[boundedIndex], ctx.rootSchema, value);
            return getFieldMessagesForSchema(selectedBranch, value).get("#") ?? [];
        }
        return getFieldMessagesForSchema(resolved, value).get("#") ?? [];
    }
    return ctx.validation.fieldMessages.get(pathToKey(path)) ?? [];
}
function getLocalNumericParseError(ctx, path) {
    const baseId = createInputId(ctx, path);
    const candidateIds = [baseId, `${baseId}-manual`];
    for (const id of candidateIds) {
        const input = globalThis.document?.getElementById(id);
        if (typeof HTMLInputElement !== "undefined" &&
            input instanceof HTMLInputElement &&
            input.dataset.parseError === "true") {
            return "Enter a valid number.";
        }
    }
    return undefined;
}
function getEnumOptionLabels(options) {
    if (!options.every((option) => typeof option === "string")) {
        return options.map((option) => String(option));
    }
    const prefix = getSharedEnumPrefix(options);
    if (!prefix) {
        return [...options];
    }
    return options.map((option) => option.slice(prefix.length) || option);
}
function getSharedEnumPrefix(options) {
    if (options.length < 2) {
        return undefined;
    }
    let common = options[0] ?? "";
    for (const option of options.slice(1)) {
        while (common && !option.startsWith(common)) {
            common = common.slice(0, -1);
        }
    }
    const separatorIndex = Math.max(common.lastIndexOf(":"), common.lastIndexOf("/"), common.lastIndexOf("."), common.lastIndexOf("_"), common.lastIndexOf("-"));
    if (separatorIndex < 0) {
        return undefined;
    }
    const prefix = common.slice(0, separatorIndex + 1);
    return options.every((option) => option.length > prefix.length) ? prefix : undefined;
}
function getControlDescribedBy(ctx, schema, path, value) {
    const describedByIds = [];
    const inputId = createInputId(ctx, path);
    if (schema.description) {
        describedByIds.push(`${inputId}-description`);
    }
    if (getFieldMessages(ctx, path, schema, value).length > 0) {
        describedByIds.push(`${inputId}-validation`);
    }
    return describedByIds.length > 0 ? describedByIds.join(" ") : undefined;
}
function renderLeafMeta(ctx, schema, path) {
    return html ` ${renderDescription(ctx, schema, path)} `;
}
function formatSimpleArrayItemLabel(schema, index) {
    const title = schema.title?.trim();
    return title ? `${title} ${index + 1}` : undefined;
}
function getArrayObjectItemLabel(schema, value, index) {
    if (isJsonObject(value)) {
        const properties = schema.properties ?? {};
        const orderedKeys = [...Object.keys(properties), ...Object.keys(value)];
        const visited = new Set();
        for (const key of orderedKeys) {
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);
            const fieldValue = value[key];
            if (fieldValue !== undefined && typeof fieldValue !== "object") {
                const formatted = String(fieldValue);
                if (formatted) {
                    return formatted;
                }
            }
        }
    }
    const title = schema.title?.trim() || "Item";
    return `${title} ${index + 1}`;
}
function getArrayMutationRules(schema, arrayLength) {
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
function renderArrayItemReorderActions(ctx, path, index, canMoveUp, canMoveDown, prefixItemsLength) {
    if (!canMoveUp && !canMoveDown) {
        return nothing;
    }
    return html `<button
      type="button"
      class="lipstick-move-up"
      ?disabled=${ctx.formDisabled || !canMoveUp}
      @click=${() => reorderArrayItem(ctx, path, index, index - 1, prefixItemsLength)}
      aria-label="Move item up"
    >
      ↑</button
    ><button
      type="button"
      class="lipstick-move-down"
      ?disabled=${ctx.formDisabled || !canMoveDown}
      @click=${() => reorderArrayItem(ctx, path, index, index + 1, prefixItemsLength)}
      aria-label="Move item down"
    >
      ↓
    </button>`;
}
function renderArrayItemRemoveAction(ctx, itemPath, canRemove) {
    return html `<button
    type="button"
    class="lipstick-remove"
    ?disabled=${ctx.formDisabled || !canRemove}
    @click=${() => removeArrayItem(ctx, itemPath)}
    aria-label="Delete array item"
  >
    ×
  </button> `;
}
function renderOptionalAddTrigger(ctx, label, onAdd, required = false) {
    return html `
    <button
      type="button"
      class="lipstick-add"
      ?disabled=${ctx.formDisabled}
      @click=${(event) => {
        event.preventDefault();
        event.stopPropagation();
        onAdd();
    }}
      aria-label="Add optional field"
    >
      <span aria-hidden="true">+</span>
      <span>${label}</span>
      ${required ? html `<span aria-hidden="true">*</span>` : nothing}
    </button>
  `;
}
function renderRemoveButton(ctx, action, label = "Remove optional field", disabled = false) {
    return html `<button
    type="button"
    class="lipstick-remove"
    ?disabled=${ctx.formDisabled || disabled}
    @click=${(event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
    }}
    aria-label=${label}
  >
    ×
  </button> `;
}
function renderInlineSimpleField(ctx, label, options, inputId, schema, control, afterControl = nothing, path = []) {
    const controls = html `
    ${afterControl}
    ${options.present && options.onRemove
        ? renderRemoveButton(ctx, options.onRemove, options.removeLabel, options.removeDisabled)
        : nothing}
  `;
    return html `
    <div data-lipstick-inline>
      ${label ? html `<label for=${inputId}>${label}</label>` : nothing} ${control}
      ${afterControl !== nothing || (options.present && options.onRemove)
        ? html `<nav class="lipstick-actions" aria-label="Field controls">${controls}</nav>`
        : nothing}
      ${renderLeafMeta(ctx, schema, path)}
    </div>
    ${options.deferValidationMessage
        ? nothing
        : renderValidationMessages(ctx, path, schema, getValueAtPath(ctx.value, path))}
  `;
}
