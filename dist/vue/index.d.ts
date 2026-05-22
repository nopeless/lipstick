import "../define.js";
import type { JsonSchemaFormEventDetail, JsonValue, JsonSchema } from "../lib/types.js";
export declare const Lipstick: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    schema: {
        type: () => JsonSchema | undefined;
        default: undefined;
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
        type: () => JsonValue | undefined;
        default: undefined;
    };
    modelValue: {
        type: () => JsonValue | undefined;
        default: undefined;
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
    "update:modelValue": (_value: JsonValue | undefined) => true;
}, string, import("vue").PublicProps, Readonly<{
    name: string;
    repair: boolean;
    disabled: boolean;
    readonly: boolean;
    persist: boolean;
} & {
    schema?: JsonSchema | undefined;
    value?: JsonValue | undefined;
    modelValue?: JsonValue | undefined;
} & {
    onInput?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    onChange?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    "onUpdate:modelValue"?: ((_value: JsonValue | undefined) => any) | undefined;
}>, {
    name: string;
    schema: JsonSchema | undefined;
    value: JsonValue | undefined;
    repair: boolean;
    disabled: boolean;
    readonly: boolean;
    persist: boolean;
    modelValue: JsonValue | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}>;
//# sourceMappingURL=index.d.ts.map