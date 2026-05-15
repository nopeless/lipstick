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
