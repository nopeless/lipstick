import test from "node:test";
import assert from "node:assert/strict";
import type { JsonSchemaFormContext } from "../src/json-schema-form/shared.js";
import type { JsonPointerPath, TSchema, JsonValue } from "../src/lib/types.js";
import {
  addAdditionalProperty,
  addArrayItem,
  addKnownProperty,
  createInputId,
  canAddAdditionalProperty,
  isCollapsed,
  removeArrayItem,
  removeProperty,
  reorderArrayItem,
  switchUnionBranch,
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
  const ctx = createContext(schema, { name: "Ada" });

  updatePathValue(ctx, ["name"], "Grace", schema.properties!.name, true);

  assert.equal(ctx.events.length, 2);
  assert.equal(ctx.events[0]?.type, "input");
  assert.equal(ctx.events[1]?.type, "change");
  assert.deepEqual(ctx.events[0]?.detail.value, { name: "Grace" });
  assert.deepEqual(ctx.events[1]?.detail.value, { name: "Grace" });
  assert.deepEqual(ctx.value, { name: "Ada" });
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
    additionalProperties: { type: "number" },
  };
  assert.equal(canAddAdditionalProperty(objectSchema), true);
  const knownPropertyCtx = createContext(objectSchema, {
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

  const additionalPropertyCtx = createContext(objectSchema, { extra: 1 });
  addAdditionalProperty(additionalPropertyCtx, [], "bonus", objectSchema);
  assert.equal(additionalPropertyCtx.events.length, 2);
  assert.deepEqual(additionalPropertyCtx.events.at(-1)?.detail.value, {
    extra: 1,
    bonus: 0,
  });

  const arrayItemCtx = createContext(objectSchema, { tags: ["a", "b"] });
  addArrayItem(arrayItemCtx, ["tags"], objectSchema.properties!.tags, 2);
  assert.deepEqual(arrayItemCtx.events.at(-1)?.detail.value, {
    tags: ["a", "b", ""],
  });
  assert.equal(arrayItemCtx.pendingFocusId, createInputId(arrayItemCtx, ["tags", 2]));

  const reorderCtx = createContext(objectSchema, { tags: ["a", "b", "c"] });
  reorderArrayItem(reorderCtx, ["tags"], 0, 2);
  assert.deepEqual(reorderCtx.events.at(-1)?.detail.value, {
    tags: ["b", "c", "a"],
  });

  const removeArrayCtx = createContext(objectSchema, { tags: ["a", "b", "c"] });
  removeArrayItem(removeArrayCtx, ["tags", 1]);
  assert.deepEqual(removeArrayCtx.events.at(-1)?.detail.value, {
    tags: ["a", "c"],
  });

  const removePropertyCtx = createContext(objectSchema, {
    extra: 1,
    name: "Ada",
  });
  removeProperty(removePropertyCtx, ["extra"]);
  assert.deepEqual(removePropertyCtx.events.at(-1)?.detail.value, {
    name: "Ada",
  });
});

test("switches nested union branches by emitting the full root value", () => {
  const schema: TSchema = {
    type: "object",
    properties: {
      config: {
        oneOf: [
          {
            title: "Alpha",
            type: "object",
            additionalProperties: false,
            properties: {
              kind: { const: "alpha" },
              value: { type: "string" },
            },
            required: ["kind"],
          },
          {
            title: "Beta",
            type: "object",
            additionalProperties: false,
            properties: {
              kind: { const: "beta" },
              count: { type: "integer" },
            },
            required: ["kind", "count"],
          },
        ],
      },
    },
  };
  const value = {
    config: {
      kind: "alpha",
      value: "hello",
    },
  };
  const ctx = createContext(schema, value);

  const nextValue = switchUnionBranch(
    ctx,
    ["config"],
    value.config,
    schema.properties!.config.oneOf!,
    schema,
    1,
  );

  assert.deepEqual(nextValue, { kind: "beta", count: 0 });
  assert.equal(ctx.events.length, 2);
  assert.deepEqual(ctx.events.at(-1)?.detail.value, {
    config: { kind: "beta", count: 0 },
  });
  assert.deepEqual(ctx.events.at(-1)?.detail.path, ["config"]);
  assert.equal(ctx.branchSelections.get("#/config"), 1);
});

test("tracks collapsed sections and generated metadata", () => {
  const ctx = createContext({ type: "string" });

  assert.equal(isCollapsed(ctx, ["section"]), false);
  toggleCollapsed(ctx, ["section"]);
  assert.equal(isCollapsed(ctx, ["section"]), true);
  assert.equal(createInputId(ctx, ["section", 1]), "lipstick-lipstick-section-1");
});

function createContext(
  rootSchema: TSchema,
  value?: JsonValue,
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
    branchSelections: new Map<string, number>(),
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

