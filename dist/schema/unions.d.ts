import type { JsonPrimitive, JsonSchema, JsonValue } from "../types.js";
export interface DiscriminatorInfo {
    property: string;
    options: Array<{
        index: number;
        value: JsonPrimitive;
    }>;
}
export interface UnionPresentation {
    kind: "boolean" | "enum" | "generic";
    selectedIndex: number;
    options: Array<{
        index: number;
        label: string;
        literal?: JsonPrimitive;
    }>;
}
export declare function describeUnion(schema: JsonSchema, value: JsonValue | undefined, root: JsonSchema, preferredIndex?: number): UnionPresentation | undefined;
export declare function pickBestBranchIndex(branches: JsonSchema[], value: JsonValue | undefined, root: JsonSchema): number;
export declare function inferDiscriminator(branches: JsonSchema[], root: JsonSchema): DiscriminatorInfo | undefined;
//# sourceMappingURL=unions.d.ts.map