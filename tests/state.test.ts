import test from "node:test";
import assert from "node:assert/strict";
import type { TSchema } from "../src/lib/types.js";
import { createTestContext } from "./helpers.js";
import {
  addAdditionalProperty,
  addKnownProperty,
  commitRootValue,
  createInputId,
  canAddAdditionalProperty,
  isCollapsed,
  removeArrayItem,
  removeProperty,
  reorderArrayItem,
  toggleCollapsed,
  updatePathValue,
} from "../src/json-schema-form/state.js";

test("emits cloned events for path updates", () => {
  const schema: TSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
  };
  const ctx = createTestContext(schema, { name: "Ada" });

  updatePathValue(ctx, ["name"], "Grace", schema.properties!.name, true);

  assert.equal(ctx.events.length, 2);
  assert.equal(ctx.events[0]?.type, "input");
  assert.equal(ctx.events[1]?.type, "change");
  assert.deepEqual(ctx.events[0]?.detail.value, { name: "Grace" });
  assert.deepEqual(ctx.events[1]?.detail.value, { name: "Grace" });
  assert.deepEqual(ctx.value, { name: "Grace" });
});

test("mutates object and array paths through helpers", () => {
  const objectSchema: TSchema = {
    type: "object",
    properties: {
      name: { type: "string", default: "Ada" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    additionalProperties: { type: "number", default: 0 },
  };
  assert.equal(canAddAdditionalProperty(objectSchema), true);
  const knownPropertyCtx = createTestContext(objectSchema, {
    tags: ["a", "b"],
    extra: 1,
  });
  addKnownProperty(knownPropertyCtx, [], "name", objectSchema.properties!.name);
  assert.equal(knownPropertyCtx.events.length, 2);
  assert.deepEqual(knownPropertyCtx.events.at(-1)?.detail.value, {
    tags: ["a", "b"],
    extra: 1,
    name: "Ada",
  });

  const additionalPropertyCtx = createTestContext(objectSchema, { extra: 1 });
  addAdditionalProperty(additionalPropertyCtx, [], "bonus", objectSchema);
  assert.equal(additionalPropertyCtx.events.length, 2);
  assert.deepEqual(additionalPropertyCtx.events.at(-1)?.detail.value, {
    extra: 1,
    bonus: 0,
  });

  const reorderCtx = createTestContext(objectSchema, { tags: ["a", "b", "c"] });
  reorderArrayItem(reorderCtx, ["tags"], 0, 2);
  assert.deepEqual(reorderCtx.events.at(-1)?.detail.value, {
    tags: ["b", "c", "a"],
  });

  const removeArrayCtx = createTestContext(objectSchema, { tags: ["a", "b", "c"] });
  removeArrayItem(removeArrayCtx, ["tags", 1]);
  assert.deepEqual(removeArrayCtx.events.at(-1)?.detail.value, {
    tags: ["a", "c"],
  });

  const removePropertyCtx = createTestContext(objectSchema, {
    extra: 1,
    name: "Ada",
  });
  removeProperty(removePropertyCtx, ["extra"]);
  assert.deepEqual(removePropertyCtx.events.at(-1)?.detail.value, {
    name: "Ada",
  });
});

test("tracks collapsed sections and generated metadata", () => {
  const ctx = createTestContext({ type: "string" });

  assert.equal(isCollapsed(ctx, ["section"]), false);
  toggleCollapsed(ctx, ["section"]);
  assert.equal(isCollapsed(ctx, ["section"]), true);
  assert.equal(createInputId(ctx, ["section", 1]), "lipstick-lipstick-section-1");
});

test("root commit prunes stale collapsed sections and additional drafts", () => {
  const schema: TSchema = {
    type: "object",
    properties: {
      keep: {
        type: "object",
        properties: {
          value: { type: "string" },
        },
      },
    },
  };
  const ctx = createTestContext(schema, { keep: { value: "a" }, stale: { value: "b" } });
  ctx.collapsedSections = new Set<string>(["#/keep", "#/stale", "#"]);
  ctx.additionalPropertyDrafts = new Map<string, string>([
    ["#/keep", "next"],
    ["#/stale", "gone"],
  ]);

  commitRootValue(ctx, [], { keep: { value: "x" } }, schema, "both");

  assert.deepEqual([...ctx.collapsedSections].sort(), ["#", "#/keep"]);
  assert.deepEqual([...ctx.additionalPropertyDrafts.entries()], [["#/keep", "next"]]);
});

test("root commit resets invalid union branch selection", () => {
  const schema: TSchema = {
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
  const ctx = createTestContext(schema, { optionalRange: 4 });
  ctx.branchSelections = new Map<string, number>([["#/optionalRange", 1]]);

  commitRootValue(ctx, [], { optionalRange: 7 }, schema, "both");

  assert.equal(ctx.branchSelections.get("#/optionalRange"), 0);
});


