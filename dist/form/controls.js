import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { acceptsType, jsonValueEquals } from "../schema.js";
import { formatDateTimeForInput, formatNumericValue, getNumericInputStep, getStringInputType, normalizeDateTimeFromInput, parseNumericInputValue, } from "../input.js";
import { parseLiteralOption, updatePathValue } from "./state.js";
export function renderScalarControl(ctx, schema, value, path, options) {
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
        const selectedIndex = value === undefined
            ? 0
            : Math.max(0, optionsList.findIndex((option) => jsonValueEquals(option, value)));
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
        ${optionsList.map((option, index) => html `<option value=${String(index)} ?selected=${index === selectedIndex}>
              ${optionLabels[index] ?? String(option)}
            </option>`)}
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
export function getLocalNumericParseError(inputId) {
    const candidateIds = [inputId, `${inputId}-manual`];
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
