import { html, nothing, type TemplateResult } from "lit";
import type { JsonPointerPath, JsonSchema, JsonValue } from "../types.js";
import { isJsonObject } from "../value.js";
import type { JsonSchemaFormContext } from "./context.js";
import { addAdditionalProperty, removeArrayItem, reorderArrayItem } from "./state.js";

export interface ArrayMutationRules {
  nextIndex: number;
  canAdd: boolean;
  canRemoveAny: boolean;
  canMutate: boolean;
}

export function renderAdditionalPropertyComposer(
  ctx: JsonSchemaFormContext,
  schema: JsonSchema,
  path: JsonPointerPath,
  canAdd: boolean,
): TemplateResult | typeof nothing {
  if (!canAdd) {
    return nothing;
  }

  const commitFromInput = (input: HTMLInputElement) => {
    const key = input.value.trim();
    addAdditionalProperty(ctx, path, key, schema);
    if (key) {
      input.value = "";
    }
  };

  return html`
    <p class="lipstick-composer">
      <span>
        <button
          type="button"
          class="lipstick-add"
          ?disabled=${ctx.formDisabled || !canAdd}
          @click=${(event: Event) => {
            const input = (event.currentTarget as HTMLButtonElement).closest(
              ".lipstick-composer",
            )?.querySelector("input");
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
        @keydown=${(event: KeyboardEvent) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          commitFromInput(event.currentTarget as HTMLInputElement);
        }}
      />
    </p>
  `;
}

export function getArrayObjectItemLabel(schema: JsonSchema, value: JsonValue, index: number): string {
  if (isJsonObject(value)) {
    const properties = schema.properties ?? {};
    const orderedKeys = [...Object.keys(properties), ...Object.keys(value)];
    const visited = new Set<string>();
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

export function formatSimpleArrayItemLabel(schema: JsonSchema, index: number): string | undefined {
  const title = schema.title?.trim();
  return title ? `${title} ${index + 1}` : undefined;
}

export function getArrayMutationRules(schema: JsonSchema, arrayLength: number): ArrayMutationRules {
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

export function renderArrayItemReorderActions(
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

  return html`<button
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

export function renderArrayItemRemoveAction(
  ctx: JsonSchemaFormContext,
  itemPath: JsonPointerPath,
  canRemove: boolean,
): TemplateResult {
  return html`<button
    type="button"
    class="lipstick-remove"
    ?disabled=${ctx.formDisabled || !canRemove}
    @click=${() => removeArrayItem(ctx, itemPath)}
    aria-label="Delete array item"
  >
    ×
  </button> `;
}
