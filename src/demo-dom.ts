import type { JsonSchemaFormElement } from './json-schema-form.js'

export interface DemoRefs {
  form: JsonSchemaFormElement
  output: HTMLElement
  schemaUrlInput: HTMLInputElement
  schemaJson: HTMLTextAreaElement
  schemaStatus: HTMLElement
  themePicker: HTMLSelectElement
  themeStylesheet: HTMLLinkElement
}

export function getDemoRefs(): DemoRefs {
  const form = document.querySelector<JsonSchemaFormElement>('json-schema-form')
  const output = document.querySelector<HTMLElement>('[data-role="output"]')
  const schemaUrlInput = document.querySelector<HTMLInputElement>(
    '[data-role="schema-url"]',
  )
  const schemaJson = document.querySelector<HTMLTextAreaElement>(
    '[data-role="schema-json"]',
  )
  const schemaStatus = document.querySelector<HTMLElement>(
    '[data-role="schema-status"]',
  )
  const themePicker = document.querySelector<HTMLSelectElement>(
    '[data-role="theme-picker"]',
  )
  const themeStylesheet = document.querySelector<HTMLLinkElement>(
    '[data-role="theme-stylesheet"]',
  )

  if (
    !form ||
    !output ||
    !schemaUrlInput ||
    !schemaJson ||
    !schemaStatus ||
    !themePicker ||
    !themeStylesheet
  ) {
    throw new Error('Demo root not found.')
  }

  return {
    form,
    output,
    schemaUrlInput,
    schemaJson,
    schemaStatus,
    themePicker,
    themeStylesheet,
  }
}
