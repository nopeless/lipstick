import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildInitialValue,
  describeUnion,
  getArrayItemSchema,
  getRefError,
  getRequiredProperties,
  inferDiscriminator,
  matchesSchema,
  pathToKey,
  pickBestBranchIndex,
  resolveSchema,
  sanitizeValueForSchema,
} from '../src/lib/schema.js'
import {
  DRAFT_2020_12_SCHEMA_URI,
  getSchemaDialectError,
  validateValueAgainstSchema,
} from '../src/lib/validation.js'
import {
  formatDateTimeForInput,
  getStringInputType,
  normalizeDateTimeFromInput,
} from '../src/lib/input.js'
import type { JsonSchema202012 } from '../src/lib/types.js'

test('resolves refs and required properties', () => {
  const schema: JsonSchema202012 = {
    $defs: {
      label: { type: 'string', minLength: 1 },
    },
    type: 'object',
    properties: {
      mode: { enum: ['draft', 'final'] },
      name: { $ref: '#/$defs/label' },
    },
    required: ['mode'],
    dependentRequired: {
      mode: ['name'],
    },
  }

  const resolved = resolveSchema(schema.properties!.name, schema, undefined)

  assert.equal(resolved.minLength, 1)
  assert.equal(getRefError(resolved), undefined)
  assert.deepEqual(getRequiredProperties(schema, undefined), new Set(['mode']))
  assert.deepEqual(
    getRequiredProperties(schema, { mode: 'draft' }),
    new Set(['mode', 'name']),
  )
})

test('builds and sanitizes values by schema', () => {
  const schema: JsonSchema202012 = {
    type: 'object',
    properties: {
      mode: { enum: ['draft', 'final'] },
      count: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['mode', 'count'],
  }

  assert.deepEqual(buildInitialValue(schema, schema), {
    mode: 'draft',
    count: 0,
  })

  assert.deepEqual(
    sanitizeValueForSchema(
      { mode: 'final', count: 'bad', tags: ['ok', 3] } as never,
      schema,
      schema,
    ),
    { mode: 'final', count: 0, tags: ['ok', ''] },
  )
})

test('maps string formats to input types', () => {
  assert.equal(getStringInputType({ type: 'string', format: 'color' }), 'color')
})

test('normalizes datetime-local values into RFC3339 date-time strings', () => {
  const localInput = '2026-05-17T09:30'
  const normalized = normalizeDateTimeFromInput(localInput)
  const dateTimeSchema: JsonSchema202012 = { type: 'string', format: 'date-time' }

  assert.match(normalized, /^2026-05-17T09:30:00[+-]\d{2}:\d{2}$/)
  assert.equal(validateValueAgainstSchema(dateTimeSchema, normalized).valid, true)
  assert.equal(formatDateTimeForInput(localInput), localInput)
  assert.match(formatDateTimeForInput('2026-05-17T14:30:00Z'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
})

test('detects union presentation and discriminators', () => {
  const schema: JsonSchema202012 = {
    oneOf: [
      {
        title: 'Alpha',
        type: 'object',
        properties: {
          kind: { const: 'alpha' },
          value: { type: 'string' },
        },
        required: ['kind'],
      },
      {
        title: 'Beta',
        type: 'object',
        properties: {
          kind: { const: 'beta' },
          count: { type: 'integer' },
        },
        required: ['kind'],
      },
    ],
  }

  const union = describeUnion(schema, { kind: 'beta', count: 2 }, schema)

  assert.equal(union?.kind, 'discriminator')
  assert.equal(union?.selectedIndex, 1)
  assert.deepEqual(inferDiscriminator(schema.oneOf!, schema)?.property, 'kind')
  assert.equal(pickBestBranchIndex(schema.oneOf!, { kind: 'alpha' }, schema), 0)
  assert.equal(
    matchesSchema({ kind: 'beta', count: 2 }, schema.oneOf![1], schema),
    true,
  )
})

test('handles array item schemas and path encoding', () => {
  const schema: JsonSchema202012 = {
    type: 'array',
    prefixItems: [{ type: 'string' }],
  }

  assert.equal(getArrayItemSchema(schema, 0)?.type, 'string')
  assert.deepEqual(getArrayItemSchema(schema, 1), {})
  assert.equal(pathToKey(['items', 1, 'name']), '#/items/1/name')
})

test('validates values with TypeBox and maps field errors', () => {
  const schema: JsonSchema202012 = {
    $schema: DRAFT_2020_12_SCHEMA_URI,
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'integer', minimum: 0 },
    },
  }

  const missingName = validateValueAgainstSchema(schema, { age: 3 })
  assert.equal(missingName.valid, false)
  assert.ok((missingName.fieldMessages.get('#/name') ?? []).length > 0)

  const invalidName = validateValueAgainstSchema(schema, { name: '', age: 3 })
  assert.equal(invalidName.valid, false)
  assert.ok(
    (invalidName.fieldMessages.get('#/name') ?? []).some((message) =>
      message.includes('fewer than 1'),
    ),
  )
})

test('keeps additionalProperties errors on the object path', () => {
  const schema: JsonSchema202012 = {
    $schema: DRAFT_2020_12_SCHEMA_URI,
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    additionalProperties: false,
  }

  const result = validateValueAgainstSchema(schema, {
    name: 'Casey',
    email: 'casey@example.com',
  })

  assert.equal(result.valid, false)
  assert.ok((result.fieldMessages.get('#') ?? []).length > 0)
  assert.equal(result.fieldMessages.has('#/email'), false)
})

test('accepts only draft 2020-12 dialect declarations', () => {
  const supportedSchema: JsonSchema202012 = {
    $schema: DRAFT_2020_12_SCHEMA_URI,
    type: 'string',
  }
  const unsupportedSchema: JsonSchema202012 = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'string',
  }

  assert.equal(getSchemaDialectError(supportedSchema), undefined)
  assert.ok(getSchemaDialectError(unsupportedSchema)?.includes('2020-12'))
})
