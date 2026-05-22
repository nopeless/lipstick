# Lipstick JSON Schema Contract

Last updated: 2026-05-22

Lipstick renders a practical JSON Schema 2020-12 subset into a compact HTML form. It does not use TypeBox and does not require schemas to be authored with any helper library.

## Component Contract

- Props/properties: `schema`, `value`, `repair`, `persist`, `disabled`, `readonly`, `name`.
- Events: `input` and `change` emit `{ value, path, schema }`.
- `value` in events is a cloned full-root JSON value.
- If `name` is set, a hidden input with that name mirrors `JSON.stringify(value ?? null)`.

## Supported Schema Surface

- Core and annotations: `$schema`, `$id`, `$defs`, `$comment`, `type`, `title`, `description`, `default`, `const`, `enum`, `readOnly`, `writeOnly`, `format`.
- Objects: `properties`, `required`, `additionalProperties`, `patternProperties`, `dependentRequired`, `dependentSchemas`.
- Arrays: `prefixItems`, `items`, `minItems`, `maxItems`.
- Composition: `oneOf`, `anyOf`, `allOf`, `if`, `then`, `else`.
- Validation: basic string length/pattern/format, numeric bounds, integer checks, and `multipleOf`.
- `$ref` is not supported in v1. Schemas containing `$ref` produce a form-level error.

## Values and Repair

- With `repair=false`, externally supplied values are not changed.
- With `repair=true`, missing required/default values are initialized using schema-aware defaults.
- Existing invalid user input is preserved and shown with validation errors.
- Missing required fields render as add actions with a required marker, for example `+ Email *`.

## Rendering Notes

- String formats map to native inputs where practical: `email`, `uri`/`url`, `date`, `date-time`, and `color`.
- Bounded numbers render as range plus numeric input.
- Simple array items render inline; object, array, and union items render as framed sections.
- Union controls detect discriminators from unique required `const` or single-value `enum` properties.
- Enum prefixes are trimmed only for display when all string options share a namespace-like prefix; emitted values are unchanged.
