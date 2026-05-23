import { type PropType } from "vue";
import "../define.js";
import type { JsonSchemaFormEventDetail } from "../types.js";
export declare const Lipstick: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    schema: {
        type: PropType<unknown>;
        required: false;
    };
    repair: {
        type: BooleanConstructor;
        default: boolean;
    };
    persist: {
        type: BooleanConstructor;
        default: boolean;
    };
    name: {
        type: StringConstructor;
        default: string;
    };
    value: {
        type: PropType<unknown>;
        required: false;
    };
    modelValue: {
        type: PropType<unknown>;
        required: false;
    };
    disabled: {
        type: BooleanConstructor;
        default: boolean;
    };
    readonly: {
        type: BooleanConstructor;
        default: boolean;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    input: (_event: CustomEvent<JsonSchemaFormEventDetail>) => true;
    change: (_event: CustomEvent<JsonSchemaFormEventDetail>) => true;
    "update:modelValue": (_value: unknown) => true;
}, string, import("vue").PublicProps, Readonly<{
    name: string;
    repair: boolean;
    disabled: boolean;
    readonly: boolean;
    persist: boolean;
} & {
    schema?: unknown;
    value?: unknown;
    modelValue?: unknown;
} & {
    onInput?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    onChange?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    "onUpdate:modelValue"?: ((_value: unknown) => any) | undefined;
}>, {
    name: string;
    repair: boolean;
    disabled: boolean;
    readonly: boolean;
    persist: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}>;
//# sourceMappingURL=index.d.ts.map