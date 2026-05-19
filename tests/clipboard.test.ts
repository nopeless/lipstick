import test from "node:test";
import assert from "node:assert/strict";
import { pasteRootValueFromClipboard } from "../src/json-schema-form/clipboard.js";
import type { JsonSchemaFormContext } from "../src/json-schema-form/shared.js";
import type { JsonPointerPath, JsonValue, TSchema } from "../src/lib/types.js";

test("paste clears stale branch selections before emitting", async () => {
  const rootSchema: TSchema = {
    type: "object",
    properties: {
      optionalRange: {
        anyOf: [
          { type: "number", minimum: 0, maximum: 10, multipleOf: 1 },
          { type: "null" },
        ],
      },
    },
  };

  const ctx = createContext(rootSchema, { optionalRange: 4 }, new Map([["#/optionalRange", 1]]));
  const originalNavigator = globalThis.navigator;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        async readText() {
          return JSON.stringify({ optionalRange: 7 });
        },
      },
    },
  });

  try {
    await pasteRootValueFromClipboard(ctx, new Event("click"));
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }

  assert.deepEqual(ctx.events.at(-1)?.detail.value, { optionalRange: 7 });
  assert.equal(ctx.branchSelections.size, 0);
});

function createContext(
  rootSchema: TSchema,
  value: JsonValue | undefined,
  branchSelections: Map<string, number>,
): JsonSchemaFormContext & {
  events: Array<{
    type: string;
    detail: {
      value: JsonValue;
      path: JsonPointerPath;
      schema: TSchema;
    };
  }>;
} {
  const events: Array<{
    type: string;
    detail: {
      value: JsonValue;
      path: JsonPointerPath;
      schema: TSchema;
    };
  }> = [];

  return Object.assign(new EventTarget(), {
    schema: rootSchema,
    value,
    name: undefined,
    disabled: false,
    readonly: false,
    branchSelections,
    additionalPropertyDrafts: new Map<string, string>(),
    collapsedSections: new Set<string>(),
    validation: {
      valid: true,
      issues: [],
      fieldMessages: new Map<string, string[]>(),
    },
    rootSchema,
    formDisabled: false,
    dispatchEvent(event: Event) {
      const detail = (
        event as CustomEvent<{
          value: JsonValue;
          path: JsonPointerPath;
          schema: TSchema;
        }>
      ).detail;
      events.push({ type: event.type, detail });
      return true;
    },
    events,
  });
}
