import { acceptsType } from "./schema.js";
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.(\d{1,3}))?)?$/;
export function getStringInputType(schema) {
    if (schema.writeOnly) {
        return "password";
    }
    switch (schema.format) {
        case "color":
            return "color";
        case "email":
            return "email";
        case "uri":
        case "url":
            return "url";
        case "date":
            return "date";
        case "date-time":
            return "datetime-local";
        default:
            return "text";
    }
}
export function formatDateTimeForInput(value) {
    if (!value) {
        return "";
    }
    const match = value.match(LOCAL_DATE_TIME_PATTERN);
    if (match) {
        const [, year, month, day, hour, minute] = match;
        return `${year}-${month}-${day}T${hour}:${minute}`;
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        return value;
    }
    return [
        date.getFullYear(),
        "-",
        pad2(date.getMonth() + 1),
        "-",
        pad2(date.getDate()),
        "T",
        pad2(date.getHours()),
        ":",
        pad2(date.getMinutes()),
    ].join("");
}
export function normalizeDateTimeFromInput(value) {
    if (!value) {
        return value;
    }
    const match = value.match(LOCAL_DATE_TIME_PATTERN);
    if (!match) {
        return value;
    }
    const [_fullMatch, year, month, day, hour, minute, seconds = "00", _fraction, millisRaw = ""] = match;
    const millis = millisRaw.padEnd(3, "0").slice(0, 3);
    const localDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(seconds), Number(millis || "0"));
    if (!Number.isFinite(localDate.getTime())) {
        return value;
    }
    const offsetMinutes = -localDate.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetRemainderMinutes = Math.abs(offsetMinutes) % 60;
    return `${year}-${month}-${day}T${hour}:${minute}:${seconds}${offsetSign}${pad2(offsetHours)}:${pad2(offsetRemainderMinutes)}`;
}
export function getNumericInputStep(schema) {
    if (typeof schema.multipleOf === "number") {
        return schema.multipleOf;
    }
    if (acceptsType(schema, "integer")) {
        return 1;
    }
    if (typeof schema.minimum === "number" &&
        typeof schema.maximum === "number" &&
        schema.maximum > schema.minimum) {
        return inferNumericStep(schema.maximum - schema.minimum);
    }
    return 0.01;
}
export function parseNumericInputValue(input) {
    const nextValue = Number(input.value);
    return Number.isNaN(nextValue) ? 0 : nextValue;
}
export function formatNumericValue(value, step) {
    if (!Number.isFinite(value)) {
        return "0";
    }
    const decimals = getStepDecimals(step);
    return decimals === 0
        ? String(Math.trunc(value))
        : value.toFixed(decimals).replace(/(?:\.0+|(\.\d*?[1-9]))0+$/, "$1");
}
function inferNumericStep(range) {
    const roughStep = range / 100;
    if (!Number.isFinite(roughStep) || roughStep <= 0) {
        return 0.01;
    }
    const exponent = Math.floor(Math.log10(roughStep));
    const magnitude = 10 ** exponent;
    const normalized = roughStep / magnitude;
    const snapped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return Number((snapped * magnitude).toPrecision(12));
}
function getStepDecimals(step) {
    if (Number.isInteger(step)) {
        return 0;
    }
    const normalized = step.toPrecision(12);
    if (normalized.includes("e-")) {
        const exponent = Number(normalized.split("e-")[1] ?? "0");
        return exponent;
    }
    const decimal = normalized.split(".")[1]?.replace(/0+$/, "") ?? "";
    return decimal.length;
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
