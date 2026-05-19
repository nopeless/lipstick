import type { TSchema } from "./types.js";
export declare function getStringInputType(schema: TSchema): string;
export declare function formatDateTimeForInput(value: string): string;
export declare function normalizeDateTimeFromInput(value: string): string;
export declare function getNumericInputStep(schema: TSchema): number;
export declare function parseNumericInputValue(input: HTMLInputElement): number;
export declare function formatNumericValue(value: number, step: number): string;
//# sourceMappingURL=input.d.ts.map