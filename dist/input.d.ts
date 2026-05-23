import type { JsonSchema } from "./types.js";
export declare function getStringInputType(schema: JsonSchema): string;
export declare function formatDateTimeForInput(value: string): string;
export declare function normalizeDateTimeFromInput(value: string): string;
export declare function getNumericInputStep(schema: JsonSchema): number;
export declare function parseNumericInputValue(input: HTMLInputElement): number;
export declare function formatNumericValue(value: number, step: number): string;
//# sourceMappingURL=input.d.ts.map