import { html, nothing } from "lit";
import { describeUnion, getArrayItemSchema, getRequiredProperties, humanizeLabel, isArraySchema, isObjectSchema, pathToKey, resolveSchema, } from "../schema.js";
import { getValueAtPath, isJsonObject } from "../value.js";
import { getFieldMessagesForSchema } from "../validation.js";
import { addArrayItem, addKnownProperty, canAddAdditionalProperty, canCollapseSchema, createInputId, getAdditionalPropertySchema, isCollapsed, isSimpleArrayItemSchema, resetRootValue, removeProperty, switchUnionBranch, toggleCollapsed, } from "./state.js";
import { copyRootValueToClipboard, pasteRootValueFromClipboard } from "./clipboard.js";
import { renderScalarControl, getLocalNumericParseError } from "./controls.js";
import { renderUnionSelector } from "./unions.js";
import { formatSimpleArrayItemLabel, getArrayMutationRules, getArrayObjectItemLabel, renderAdditionalPropertyComposer, renderArrayItemRemoveAction, renderArrayItemReorderActions, } from "./arrays-objects.js";
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
function renderUnionBranch(ctx, branchSchema, value, path) {
    return renderNode(ctx, branchSchema, value, path, {
        required: true,
        present: true,
        framed: false,
        collapsible: false,
    });
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
    ${schema.additionalProperties ? renderAdditionalPropertyComposer(ctx, schema, path, canAddAdditionalProperty(schema)) : nothing}
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
    const isTupleItem = index < prefixItemsLength;
    const simpleItemLabel = isTupleItem
        ? formatSimpleArrayItemLabel(resolvedItemSchema, index)
        : undefined;
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
    const localNumericError = getLocalNumericParseError(createInputId(ctx, path));
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
