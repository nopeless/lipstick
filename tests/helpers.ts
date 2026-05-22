import type { JsonSchemaFormContext } from "../src/json-schema-form/shared.js";
import type { JsonPointerPath, JsonValue, JsonSchema } from "../src/lib/types.js";

export type RecordedEvent = {
  type: string;
  detail: {
    value: JsonValue;
    path: JsonPointerPath;
    schema: JsonSchema;
  };
};

export function createTestContext(
  rootSchema: JsonSchema,
  value?: JsonValue,
  branchSelections = new Map<string, number>(),
): JsonSchemaFormContext & { events: RecordedEvent[] } {
  const events: RecordedEvent[] = [];

  return Object.assign(new EventTarget(), {
    schema: rootSchema,
    name: "",
    value,
    repair: false,
    disabled: false,
    readonly: false,
    branchSelections,
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
      schema: JsonSchema,
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
          schema: JsonSchema;
        }>
      ).detail;
      events.push({ type: event.type, detail });
      return true;
    },
    events,
  });
}
