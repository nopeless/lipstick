import { html } from "lit";
export function renderUnionSelector(ctx, union, changeBranch) {
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
