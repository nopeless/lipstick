import test from "node:test";
import assert from "node:assert/strict";
import { pasteRootValueFromClipboard } from "../src/form/clipboard.js";
import type { JsonSchema } from "../src/types.js";
import { createTestContext } from "./helpers.js";

test("paste clears stale branch selections before emitting", async () => {
  const rootSchema: JsonSchema = {
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

  const ctx = createTestContext(rootSchema, { optionalRange: 4 }, new Map([["#/optionalRange", 1]]));
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
  assert.equal(ctx.branchSelections.get("#/optionalRange"), 0);
});


