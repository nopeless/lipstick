import type { JsonPrimitive, TSchema, JsonValue } from "../types.js";
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
export declare function describeUnion(schema: TSchema, value: JsonValue | undefined, root: TSchema, preferredIndex?: number): UnionPresentation | undefined;
export declare function pickBestBranchIndex(branches: TSchema[], value: JsonValue | undefined, root: TSchema): number;
export declare function inferDiscriminator(branches: TSchema[], root: TSchema): DiscriminatorInfo | undefined;
//# sourceMappingURL=unions.d.ts.map