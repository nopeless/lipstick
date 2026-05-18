# Lipstick Input/Schema Semantics (Concise)

Last updated: 2026-05-18

This is a practical reference for how `<lipstick-form>` behaves today.

## Component Contract

- Props: `schema`, `value`, `name`, `disabled`, `readonly`.
- `readonly` and `disabled` both disable interaction.
- If `name` is set, a hidden input mirrors full JSON as `JSON.stringify(value ?? null)`.

## Update Events

- Edits emit `CustomEvent` detail: `{ value, path, schema }`.
- `value` is always a cloned full-root JSON value.
- Live edits emit `input`; committed edits emit `input` then `change`.
- Structural actions (add/remove/reorder/switch union branch) emit both `input` and `change`.

## Supported Schema Features (as implemented)

- Core: `type`, `enum`, `const`, `default`, `required`, `properties`, `additionalProperties`, `prefixItems`, `items`, `minItems`, `maxItems`.
- Composition/conditionals: `oneOf`, `anyOf`, `allOf`, `if/then/else`, `dependentRequired`, `dependentSchemas`.
- Refs: local `$ref` (`#...`) only.
- Validation engine: TypeBox compile/validate.

## Resolution + Validation Notes

- No strict `$schema` allow-list is enforced by the component.
- Non-local `$ref` is not resolved; an inline ref warning is shown.
- Schema compile failures are shown as a form-level error.
- Validation messages are path-keyed (`#`, `#/...`) and shown inline.
- `required` and `dependentRequired` errors are expanded to concrete field paths.

## Value Initialization

Creation priority:

1. `default`
2. `const`
3. first `enum`
4. first `oneOf` branch
5. first `anyOf` branch
6. type fallback

Type fallback:

- object: required fields + fields with `default`/`const`
- array: `[]`
- boolean: `false`
- number/integer: `0`
- null: `null`
- string/other: `""`

## Sanitization Rules

- `const` is forced.
- Invalid `enum` value falls back to first enum option.
- `oneOf`/`anyOf` sanitize against selected branch.
- Object unknown keys:
  - removed when `additionalProperties: false`
  - sanitized by `additionalProperties` schema when provided
  - otherwise kept
- Array items sanitize by `prefixItems[index]`, else `items`, else `{}`.
- Arrays are truncated to `maxItems`.

## Rendering Behavior

- Scalars:
  - `const`/`null`: readonly text
  - `enum`: select
  - `boolean`: checkbox
  - `number`/`integer`: number input, or range + number when both min/max exist
  - strings: text input; textarea for `format: "textarea"` or `maxLength > 200`
  - string formats map to `email`, `url`, `date`, `datetime-local`, `color`
  - `writeOnly` uses password input
- Date-time values are edited via `datetime-local` and stored as offset date-time strings (`YYYY-MM-DDTHH:mm:ss±HH:MM`).

## Unions, Objects, Arrays

- Union branch selection priority:
  - explicit prior selection
  - discriminator literal match
  - first validating branch
  - index `0`
- Switching branches sanitizes current value to branch shape.
- Objects:
  - required fields always visible
  - optional known fields are add/remove
  - additional keys are addable when `additionalProperties !== false`
- Arrays:
  - add hidden when blocked by `maxItems` or tuple exhaustion (`items: false`)
  - remove allowed when `length > minItems`
  - tuple prefix region is protected from reorder/mutation across boundary

## Known Gaps

- No remote `$ref` resolution.
- `patternProperties` is not used to drive dynamic-key UI behavior.
- Many JSON Schema keywords are validator-only (not enforced by UI mechanics).
