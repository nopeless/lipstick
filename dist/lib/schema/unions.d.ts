import type { JsonPrimitive, JsonSchema202012, JsonValue } from "../types.js";
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
export declare function describeUnion(schema: JsonSchema202012, value: JsonValue | undefined, root: JsonSchema202012, preferredIndex?: number): UnionPresentation | undefined;
export declare function pickBestBranchIndex(branches: JsonSchema202012[], value: JsonValue | undefined, root: JsonSchema202012): number;
export declare function inferDiscriminator(branches: JsonSchema202012[], root: JsonSchema202012): DiscriminatorInfo | undefined;
//# sourceMappingURL=unions.d.ts.map