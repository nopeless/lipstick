import type { JsonSchemaFormContext } from "../src/json-schema-form/shared.js";
import type { JsonPointerPath, JsonValue, TSchema } from "../src/lib/types.js";

export type RecordedEvent = {
  type: string;
  detail: {
    value: JsonValue;
    path: JsonPointerPath;
    schema: TSchema;
  };
};

export function createTestContext(
  rootSchema: TSchema,
  value?: JsonValue,
  branchSelections = new Map<string, number>(),
): JsonSchemaFormContext & { events: RecordedEvent[] } {
  const events: RecordedEvent[] = [];

  return Object.assign(new EventTarget(), {
    schema: rootSchema,
    value,
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
    applyFormValueUpdate(
      type: "input" | "change" | "both",
      path: JsonPointerPath,
      nextValue: JsonValue,
      schema: TSchema,
    ) {
      this.value = nextValue;
      if (type === "input" || type === "both") {
        events.push({
          type: "input",
          detail: { value: structuredClone(nextValue), path, schema },
        });
      }
      if (type === "change" || type === "both") {
        events.push({
          type: "change",
          detail: { value: structuredClone(nextValue), path, schema },
        });
      }
    },
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
