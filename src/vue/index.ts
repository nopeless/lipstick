import { defineComponent, h } from "vue";
import "../define.js";
export { FrameworkVueSampleApp, mountFrameworkVueSample } from "../../framework/vue/index.js";
import type { JsonSchemaFormEventDetail, JsonValue, TSchema } from "../lib/types.js";

export const Lipstick = defineComponent({
  name: "Lipstick",
  props: {
    schema: { type: Object as () => TSchema | undefined, default: undefined },
    value: { type: null as unknown as () => JsonValue | undefined, default: undefined },
    modelValue: { type: null as unknown as () => JsonValue | undefined, default: undefined },
    name: { type: String, default: undefined },
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
    ): event is CustomEvent<JsonSchemaFormEventDetail> & { currentTarget: Element; target: Element } => {
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
        value: props.modelValue ?? props.value,
        name: props.name,
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

export default Lipstick;
