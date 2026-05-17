# Lipstick Input Value Semantics (Draft 2020-12)

This document describes how `lip-stick` interprets schema definitions and updates form values.

## Scope

- Only JSON Schema Draft 2020-12 is supported.
- Supported `$schema` values:
  - `https://json-schema.org/draft/2020-12/schema`
  - `https://json-schema.org/draft/2020-12/schema#`
  - `http://json-schema.org/draft/2020-12/schema`
  - `http://json-schema.org/draft/2020-12/schema#`
- If `$schema` is omitted, the form treats the schema as Draft 2020-12.
- Any other `$schema` value is rejected and shown as a form-level error.

## Event Model

- User edits emit an `input` event with a cloned full-root value.
- Commit actions emit `change` immediately after `input`.
- `input` is used for live updates (typing, slider drag).
- `change` is used for committed updates (blur/select/release).

## Initialization Rules

When a value is created from schema (for required fields, added properties, added array items):

- `default` wins first.
- Else `const` wins.
- Else first `enum` value wins.
- `oneOf` and `anyOf` initialize from the first branch.
- Object fields initialize required children, plus children with `default` or `const`.
- Arrays initialize as `[]`.
- Primitive fallback values:
  - `boolean` -> `false`
  - `integer` / `number` -> `0`
  - `null` -> `null`
  - `string` (or unknown primitive) -> `""`

## Per-Type Input Behavior

- `string`
  - Uses `<input type="text">` unless format maps to `email`, `url`, `date`, `datetime-local`, or `color`.
  - Uses `<textarea>` when `format: "textarea"` or `maxLength > 200`.
  - For `format: "date-time"`, UI uses `datetime-local` for editing, then converts user input to RFC3339 (`YYYY-MM-DDTHH:mm:ss±HH:MM`) before storing.
  - Existing RFC3339 `date-time` values are converted to local `YYYY-MM-DDTHH:mm` for display in the control.
- `writeOnly: true`
  - Uses `<input type="password">`.
- `boolean`
  - Uses a checkbox switch.
- `integer` / `number`
  - Uses a number input.
  - If both `minimum` and `maximum` exist, uses range + number pair.
  - `multipleOf` sets `step`; otherwise integers use `1`, and numbers infer step.
- `enum`
  - Uses `<select>`.
  - If current value is not in enum, first enum value is displayed/used on commit.
- `const`
  - Renders as non-editable output.
- `null`
  - Renders as non-editable `null`.

## Union Behavior

- `oneOf` / `anyOf` render with a variant selector.
- Branch selection priority:
  - explicit user selection for that path
  - discriminator match (if inferable)
  - first branch that validates
  - fallback to branch `0`
- Switching branches sanitizes the current value to the selected branch shape.
- Primitive `anyOf` unions render as a compact inline control with cycle support.

## Object Behavior

- Required keys are always shown.
- Optional known keys are add/remove capable.
- Unknown keys are editable only when `additionalProperties !== false`.
- Added dynamic keys use the `additionalProperties` schema when provided; otherwise open schema `{}`.
- `dependentRequired` contributes to runtime required-key calculation.

## Array Behavior

- Item schema resolution order:
  - `prefixItems[index]`
  - `items` schema (or open `{}` if `items` is absent/object)
- Add is disabled when `items === false` and `prefixItems` are exhausted.
- Remove is disabled for indexes below `minItems`.
- Reorder supports move up/down within current bounds.

## Validation Behavior

- Validation uses `typebox` (`typebox/schema`) against the current root value.
- Errors are mapped to field paths using JSON Pointer.
- Required/dependent/additional-property errors are expanded to concrete field paths when possible.
- Invalid fields receive:
  - `aria-invalid="true"`
  - `aria-errormessage` reference
  - inline error text (`role="alert"`)

## Semantics and Accessibility

- Editable controls are label-associated by `for/id`.
- Fields are treated as implicitly required unless a remove (`x`) action is shown for that field.
- Required controls set HTML `required` where meaningful.
- Controls reference description and validation text through `aria-describedby`.
- `readOnly` schema or form-level disabled state disables interaction.
