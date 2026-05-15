import { acceptsType } from './schema.js'
import type { JsonSchema202012 } from './types.js'

export function getStringInputType(schema: JsonSchema202012): string {
  if (schema.writeOnly) {
    return 'password'
  }

  switch (schema.format) {
    case 'color':
      return 'color'
    case 'email':
      return 'email'
    case 'uri':
    case 'url':
      return 'url'
    case 'date':
      return 'date'
    case 'date-time':
      return 'datetime-local'
    default:
      return 'text'
  }
}

export function getNumericInputStep(schema: JsonSchema202012): number {
  if (typeof schema.multipleOf === 'number') {
    return schema.multipleOf
  }

  if (acceptsType(schema, 'integer')) {
    return 1
  }

  if (
    typeof schema.minimum === 'number' &&
    typeof schema.maximum === 'number' &&
    schema.maximum > schema.minimum
  ) {
    return inferNumericStep(schema.maximum - schema.minimum)
  }

  return 0.01
}

export function parseNumericInputValue(input: HTMLInputElement): number {
  const nextValue = Number(input.value)
  return Number.isNaN(nextValue) ? 0 : nextValue
}

export function formatNumericValue(value: number, step: number): string {
  if (!Number.isFinite(value)) {
    return '0'
  }

  const decimals = getStepDecimals(step)
  return decimals === 0
    ? String(Math.trunc(value))
    : value.toFixed(decimals).replace(/(?:\.0+|(\.\d*?[1-9]))0+$/, '$1')
}

function inferNumericStep(range: number): number {
  const roughStep = range / 100

  if (!Number.isFinite(roughStep) || roughStep <= 0) {
    return 0.01
  }

  const exponent = Math.floor(Math.log10(roughStep))
  const magnitude = 10 ** exponent
  const normalized = roughStep / magnitude
  const snapped =
    normalized <= 1 ? 1
    : normalized <= 2 ? 2
    : normalized <= 5 ? 5
    : 10

  return Number((snapped * magnitude).toPrecision(12))
}

function getStepDecimals(step: number): number {
  if (Number.isInteger(step)) {
    return 0
  }

  const normalized = step.toPrecision(12)

  if (normalized.includes('e-')) {
    const exponent = Number(normalized.split('e-')[1] ?? '0')
    return exponent
  }

  const decimal = normalized.split('.')[1]?.replace(/0+$/, '') ?? ''
  return decimal.length
}
