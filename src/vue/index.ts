import { defineComponent, h } from "vue";
import "../define.js";
import type { JsonSchemaFormEventDetail, JsonValue, TSchema } from "../lib/types.js";

export const Lipstick = defineComponent({
  name: "Lipstick",
  props: {
    schema: { type: Object as () => TSchema | undefined, default: undefined },
    repair: { type: Boolean, default: false },
    value: { type: null as unknown as () => JsonValue | undefined, default: undefined },
    modelValue: { type: null as unknown as () => JsonValue | undefined, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: {
    input: (_event: CustomEvent<JsonSchemaFormEventDetail>) => true,
    change: (_event: CustomEvent<JsonSchemaFormEventDetail>) => true,
    "update:modelValue": (_value: JsonValue | undefined) => true,
  },
  setup(props, { emit }) {
    const isFormEvent = (
      event: Event,
    ): event is CustomEvent<JsonSchemaFormEventDetail> & {
      currentTarget: Element;
      target: Element;
    } => {
      if (!(event instanceof CustomEvent)) {
        return false;
      }

      if (!event.detail || typeof event.detail !== "object" || !("value" in event.detail)) {
        return false;
      }

      return event.target === event.currentTarget;
    };

    return () =>
      h("lipstick-form", {
        schema: props.schema,
        repair: props.repair,
        value: props.modelValue ?? props.value,
        disabled: props.disabled,
        readonly: props.readonly,
        onInput: (event: Event) => {
          if (!isFormEvent(event)) {
            return;
          }
          const customEvent = event;
          emit("input", customEvent);
          emit("update:modelValue", customEvent.detail.value);
        },
        onChange: (event: Event) => {
          if (!isFormEvent(event)) {
            return;
          }
          const customEvent = event;
          emit("change", customEvent);
        },
      });
  },
});
