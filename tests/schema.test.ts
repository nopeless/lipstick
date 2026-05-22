import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialValue,
  describeUnion,
  getArrayItemSchema,
  pathToKey,
  repairValueForSchema,
} from "../src/lib/schema.js";
import { validateValueAgainstSchema } from "../src/lib/validation.js";
import {
  formatDateTimeForInput,
  getStringInputType,
  normalizeDateTimeFromInput,
} from "../src/lib/input.js";
import type { JsonSchema } from "../src/lib/types.js";

const thenKeyword = ("th" + "en") as "then";

test("maps string formats to input types", () => {
  assert.equal(getStringInputType({ type: "string", format: "color" }), "color");
});

test("normalizes datetime-local values into RFC3339 date-time strings", () => {
  const localInput = "2026-05-17T09:30";
  const normalized = normalizeDateTimeFromInput(localInput);
  const dateTimeSchema: JsonSchema = {
    type: "string",
    format: "date-time",
  };

  assert.match(normalized, /^2026-05-17T09:30:00[+-]\d{2}:\d{2}$/);
  assert.equal(validateValueAgainstSchema(dateTimeSchema, normalized).valid, true);
  assert.equal(formatDateTimeForInput(localInput), localInput);
  assert.match(
    formatDateTimeForInput("2026-05-17T14:30:00Z"),
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  );
});

test("handles array item schemas and path encoding", () => {
  const schema: JsonSchema = {
    type: "array",
    prefixItems: [{ type: "string" }],
  };

  assert.equal(getArrayItemSchema(schema, 0)?.type, "string");
  assert.deepEqual(getArrayItemSchema(schema, 1), {});
  assert.equal(pathToKey(["items", 1, "name"]), "#/items/1/name");
});

test("validates native JSON Schema subset and maps field errors", () => {
  const schema: JsonSchema = {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", minLength: 1 },
      age: { type: "integer", minimum: 0 },
    },
  };

  const missingName = validateValueAgainstSchema(schema, { age: 3 });
  assert.equal(missingName.valid, false);
  assert.ok((missingName.fieldMessages.get("#/name") ?? []).length > 0);

  const invalidName = validateValueAgainstSchema(schema, { name: "", age: 3 });
  assert.equal(invalidName.valid, false);
  assert.ok(
    (invalidName.fieldMessages.get("#/name") ?? []).some((message) =>
      message.includes("at least 1"),
    ),
  );
});

test("keeps additionalProperties errors on the unknown property path", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    additionalProperties: false,
  };

  const result = validateValueAgainstSchema(schema, {
    name: "Casey",
    email: "casey@example.com",
  });

  assert.equal(result.valid, false);
  assert.ok((result.fieldMessages.get("#/email") ?? []).length > 0);
});

test("supports conditionals and dependentRequired", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      mode: { enum: ["immediate", "scheduled"] },
      publishAt: { type: "string", format: "date-time" },
      token: { type: "string" },
      tokenName: { type: "string" },
    },
    if: {
      properties: {
        mode: { const: "scheduled" },
      },
    },
    [thenKeyword]: {
      required: ["publishAt"],
    },
    dependentRequired: {
      token: ["tokenName"],
    },
  };

  const result = validateValueAgainstSchema(schema, {
    mode: "scheduled",
    token: "abc",
  });

  assert.equal(result.valid, false);
  assert.ok(result.fieldMessages.has("#/publishAt"));
  assert.ok(result.fieldMessages.has("#/tokenName"));
});

test("rejects unsupported refs with a schema-level error", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      user: { $ref: "#/$defs/user" },
    },
    $defs: {
      user: { type: "string" },
    },
  };

  const result = validateValueAgainstSchema(schema, { user: "Ada" });
  assert.equal(result.valid, false);
  assert.match(result.schemaError ?? "", /\$ref is not supported/);
});

test("initializes required/default values and preserves existing invalid input", () => {
  const schema: JsonSchema = {
    type: "object",
    required: ["profile", "tags", "enabled"],
    properties: {
      profile: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          status: { enum: ["draft", "published"], default: "draft" },
        },
      },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      enabled: { type: "boolean" },
    },
  };

  assert.deepEqual(createInitialValue(schema), {
    profile: { name: "", email: "", status: "draft" },
    tags: [],
    enabled: false,
  });

  assert.deepEqual(repairValueForSchema(schema, { profile: { name: 12 } }), {
    profile: { name: 12, email: "", status: "draft" },
    tags: [],
    enabled: false,
  });
});

test("detects discriminated unions from required literal properties", () => {
  const schema: JsonSchema = {
    oneOf: [
      {
        type: "object",
        required: ["kind", "email"],
        properties: {
          kind: { const: "email" },
          email: { type: "string" },
        },
      },
      {
        type: "object",
        required: ["kind", "url"],
        properties: {
          kind: { const: "webhook" },
          url: { type: "string" },
        },
      },
    ],
  };

  const union = describeUnion(schema, { kind: "webhook", url: "https://example.com" }, schema);
  assert.equal(union?.selectedIndex, 1);
  assert.deepEqual(
    union?.options.map((option) => option.label),
    ["email", "webhook"],
  );
});
