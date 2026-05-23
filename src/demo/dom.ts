import type { LipstickFormElement } from "../lipstick-form.js";

export interface DemoRefs {
  form: LipstickFormElement;
  output: HTMLElement;
  schemaSourcePicker: HTMLSelectElement | null;
  schemaUrlInput: HTMLInputElement | null;
  schemaJson: HTMLTextAreaElement;
  schemaStatus: HTMLElement;
  themePicker: HTMLSelectElement;
}

export function getDemoRefs(): DemoRefs {
  const form = document.querySelector<LipstickFormElement>("#demo");
  const output = document.querySelector<HTMLElement>('[data-role="output"]');
  const schemaSourcePicker = document.querySelector<HTMLSelectElement>(
    '[data-role="schema-source-picker"]',
  );
  const schemaUrlInput = document.querySelector<HTMLInputElement>('[data-role="schema-url"]');
  const schemaJson = document.querySelector<HTMLTextAreaElement>('[data-role="schema-json"]');
  const schemaStatus = document.querySelector<HTMLElement>('[data-role="schema-status"]');
  const themePicker = document.querySelector<HTMLSelectElement>('[data-role="theme-picker"]');

  if (!form || !output || !schemaJson || !schemaStatus || !themePicker) {
    throw new Error("Demo root not found.");
  }

  return {
    form,
    output,
    schemaSourcePicker,
    schemaUrlInput,
    schemaJson,
    schemaStatus,
    themePicker,
  };
}
