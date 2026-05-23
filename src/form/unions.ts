import { html, type TemplateResult } from "lit";
import type { UnionPresentation } from "../schema.js";
import type { JsonSchemaFormContext } from "./context.js";

export function renderUnionSelector(
  ctx: JsonSchemaFormContext,
  union: UnionPresentation,
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
        ⇄</button
      ><select
        .disabled=${ctx.formDisabled}
        .value=${String(selectedIndex)}
        @change=${(event: Event) => changeBranch(Number((event.target as HTMLSelectElement).value))}
      >
        ${options.map(
          (option) => html`
            <option value=${String(option.index)} ?selected=${option.index === selectedIndex}>
              ${option.label}
            </option>
          `,
        )}
      </select>
    </div>
  `;

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
