import { html, nothing } from "lit";
import { isJsonObject } from "../value.js";
import { addAdditionalProperty, removeArrayItem, reorderArrayItem } from "./state.js";
export function renderAdditionalPropertyComposer(ctx, schema, path, canAdd) {
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
    <p class="lipstick-composer">
      <span>
        <button
          type="button"
          class="lipstick-add"
          ?disabled=${ctx.formDisabled || !canAdd}
          @click=${(event) => {
        const input = event.currentTarget.closest(".lipstick-composer")?.querySelector("input");
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
export function getArrayObjectItemLabel(schema, value, index) {
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
export function formatSimpleArrayItemLabel(schema, index) {
    const title = schema.title?.trim();
    return title ? `${title} ${index + 1}` : undefined;
}
export function getArrayMutationRules(schema, arrayLength) {
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
export function renderArrayItemReorderActions(ctx, path, index, canMoveUp, canMoveDown, prefixItemsLength) {
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
export function renderArrayItemRemoveAction(ctx, itemPath, canRemove) {
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
