import { nothing, type TemplateResult } from "lit";
import type { JsonPointerPath, JsonSchema, JsonValue } from "../types.js";
import type { JsonSchemaFormContext } from "./context.js";
export interface ArrayMutationRules {
    nextIndex: number;
    canAdd: boolean;
    canRemoveAny: boolean;
    canMutate: boolean;
}
export declare function renderAdditionalPropertyComposer(ctx: JsonSchemaFormContext, schema: JsonSchema, path: JsonPointerPath, canAdd: boolean): TemplateResult | typeof nothing;
export declare function getArrayObjectItemLabel(schema: JsonSchema, value: JsonValue, index: number): string;
export declare function formatSimpleArrayItemLabel(schema: JsonSchema, index: number): string | undefined;
export declare function getArrayMutationRules(schema: JsonSchema, arrayLength: number): ArrayMutationRules;
export declare function renderArrayItemReorderActions(ctx: JsonSchemaFormContext, path: JsonPointerPath, index: number, canMoveUp: boolean, canMoveDown: boolean, prefixItemsLength: number): TemplateResult | typeof nothing;
export declare function renderArrayItemRemoveAction(ctx: JsonSchemaFormContext, itemPath: JsonPointerPath, canRemove: boolean): TemplateResult;
//# sourceMappingURL=arrays-objects.d.ts.map