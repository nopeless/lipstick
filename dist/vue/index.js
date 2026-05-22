import { defineComponent, h } from "vue";
import "../define.js";
export const Lipstick = defineComponent({
    name: "Lipstick",
    props: {
        schema: { type: Object, default: undefined },
        repair: { type: Boolean, default: false },
        persist: { type: Boolean, default: false },
        name: { type: String, default: "" },
        value: { type: null, default: undefined },
        modelValue: { type: null, default: undefined },
        disabled: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
    },
    emits: {
        input: (_event) => true,
        change: (_event) => true,
        "update:modelValue": (_value) => true,
    },
    setup(props, { emit }) {
        const isFormEvent = (event) => {
            if (!(event instanceof CustomEvent)) {
                return false;
            }
            if (!event.detail || typeof event.detail !== "object" || !("value" in event.detail)) {
                return false;
            }
            return event.target === event.currentTarget;
        };
        return () => h("lipstick-form", {
            schema: props.schema,
            repair: props.repair,
            persist: props.persist,
            name: props.name,
            value: props.modelValue ?? props.value,
            disabled: props.disabled,
            readonly: props.readonly,
            onInput: (event) => {
                if (!isFormEvent(event)) {
                    return;
                }
                const customEvent = event;
                emit("input", customEvent);
                emit("update:modelValue", customEvent.detail.value);
            },
            onChange: (event) => {
                if (!isFormEvent(event)) {
                    return;
                }
                const customEvent = event;
                emit("change", customEvent);
            },
        });
    },
});
