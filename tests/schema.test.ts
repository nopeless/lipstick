import test from "node:test";
import assert from "node:assert/strict";
import {
  getArrayItemSchema,
  pathToKey,
} from "../src/lib/schema.js";
import { validateValueAgainstSchema } from "../src/lib/validation.js";
import {
  formatDateTimeForInput,
  getStringInputType,
  normalizeDateTimeFromInput,
} from "../src/lib/input.js";
import type { TSchema } from "../src/lib/types.js";

test("maps string formats to input types", () => {
  assert.equal(getStringInputType({ type: "string", format: "color" }), "color");
});

test("normalizes datetime-local values into RFC3339 date-time strings", () => {
  const localInput = "2026-05-17T09:30";
  const normalized = normalizeDateTimeFromInput(localInput);
  const dateTimeSchema: TSchema = {
    type: "string",
    format: "date-time",
  };

  assert.match(normalized, /^2026-05-17T09:30:00[+-]\d{2}:\d{2}$/);
  assert.equal(validateValueAgainstSchema(dateTimeSchema, normalized).valid, true);
  assert.equal(formatDateTimeForInput(localInput), localInput);
  assert.match(formatDateTimeForInput("2026-05-17T14:30:00Z"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test("handles array item schemas and path encoding", () => {
  const schema: TSchema = {
    type: "array",
    prefixItems: [{ type: "string" }],
  };

  assert.equal(getArrayItemSchema(schema, 0)?.type, "string");
  assert.deepEqual(getArrayItemSchema(schema, 1), {});
  assert.equal(pathToKey(["items", 1, "name"]), "#/items/1/name");
});

test("validates values with TypeBox and maps field errors", () => {
  const schema: TSchema = {
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
      message.includes("fewer than 1"),
    ),
  );
});

test("keeps additionalProperties errors on the object path", () => {
  const schema: TSchema = {
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
  assert.ok((result.fieldMessages.get("#") ?? []).length > 0);
  assert.equal(result.fieldMessages.has("#/email"), false);
});

test("supports legacy dialect declarations at compile time", () => {
  const supportedSchema: TSchema = {
    type: "string",
  };
  const unsupportedSchema: TSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "string",
  };

  assert.equal(validateValueAgainstSchema(supportedSchema, "ok").schemaError, undefined);
  assert.equal(validateValueAgainstSchema(unsupportedSchema, "ok").schemaError, undefined);
});


