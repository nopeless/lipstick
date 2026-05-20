import "../define.js";
import type { JsonSchemaFormEventDetail, JsonValue, TSchema } from "../lib/types.js";
export declare const Lipstick: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    schema: {
        type: () => TSchema | undefined;
        default: undefined;
    };
    value: {
        type: () => JsonValue | undefined;
        default: undefined;
    };
    modelValue: {
        type: () => JsonValue | undefined;
        default: undefined;
    };
    name: {
        type: StringConstructor;
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
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    schema: {
        type: () => TSchema | undefined;
        default: undefined;
    };
    value: {
        type: () => JsonValue | undefined;
        default: undefined;
    };
    modelValue: {
        type: () => JsonValue | undefined;
        default: undefined;
    };
    name: {
        type: StringConstructor;
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
}>> & Readonly<{
    onInput?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    onChange?: ((_event: CustomEvent<JsonSchemaFormEventDetail>) => any) | undefined;
    "onUpdate:modelValue"?: ((_value: JsonValue | undefined) => any) | undefined;
}>, {
    schema: TSchema | undefined;
    value: JsonValue | undefined;
    name: string;
    disabled: boolean;
    readonly: boolean;
    modelValue: JsonValue | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=index.d.ts.map