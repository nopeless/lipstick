import test from "node:test";
import assert from "node:assert/strict";
import type { TemplateResult } from "lit";
import { renderForm } from "../src/form/render.js";
import type { JsonSchema } from "../src/types.js";
import { createTestContext } from "./helpers.js";

test("renders absent required properties as add actions with required markers", () => {
  const schema: JsonSchema = {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        title: "Name",
      },
    },
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, {})));

  assert.match(output, />\+<\/span>/);
  assert.match(output, />Name<\/span>/);
  assert.match(output, />\*<\/span>/);
});

test("renders homogeneous simple array items without labels", () => {
  const schema: JsonSchema = {
    type: "array",
    title: "Tags",
    items: {
      type: "string",
      title: "Tag",
    },
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, ["alpha"])));

  assert.doesNotMatch(output, /<label[^>]*>Tag 1<\/label>/);
});

test("marks each loaded enum array item option as selected", () => {
  const schema: JsonSchema = {
    type: "array",
    title: "Steps",
    items: {
      enum: ["stocks", "debt", "ppe"],
    },
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, ["stocks", "debt"])));

  assert.match(
    output,
    /id=lipstick-lipstick-0[\s\S]*<option value=0 \?selected=true>[\s\S]*stocks/,
  );
  assert.match(
    output,
    /id=lipstick-lipstick-1[\s\S]*<option value=1 \?selected=true>[\s\S]*debt/,
  );
});

test("renders primitive union array items inline with delete actions", () => {
  const schema: JsonSchema = {
    type: "array",
    title: "List",
    items: {
      type: "string",
      anyOf: [{ const: "a" }, { const: "b" }, { const: "c" }],
    },
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, ["a"])));

  assert.doesNotMatch(output, /<label[^>]*>Item 1<\/label>/);
  assert.match(output, /data-lipstick-simple-array-item/);
  assert.match(output, /aria-label="Cycle variant"/);
  assert.match(output, /aria-label="Delete array item"/);
});

test("keeps tuple labels for inline scalar tuple items", () => {
  const schema: JsonSchema = {
    type: "array",
    title: "Tuple",
    prefixItems: [
      {
        type: "string",
        title: "Label",
      },
    ],
    items: false,
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, ["primary"])));

  assert.match(output, /<label[^>]*>Label 1<\/label>/);
});

test("renders additional property composer with class hook", () => {
  const schema: JsonSchema = {
    type: "object",
    additionalProperties: true,
  };

  const output = flattenTemplate(renderForm(createTestContext(schema, {})));

  assert.match(output, /class="lipstick-composer"/);
  assert.doesNotMatch(output, /data-lipstick-composer/);
});

function flattenTemplate(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(flattenTemplate).join("");
  }

  if (isTemplateResult(value)) {
    return value.strings
      .map((part, index) => `${part}${flattenTemplate(value.values[index])}`)
      .join("");
  }

  return "";
}

function isTemplateResult(value: unknown): value is TemplateResult & {
  strings: readonly string[];
  values: readonly unknown[];
} {
  return typeof value === "object" && value !== null && "strings" in value && "values" in value;
}
