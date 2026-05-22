import { repairValueForSchema } from "../lib/schema.js";
import { commitRootValue } from "./state.js";
export async function copyRootValueToClipboard(ctx, event) {
    event.preventDefault();
    event.stopPropagation();
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) {
        return;
    }
    try {
        await clipboard.writeText(JSON.stringify(ctx.value ?? null, null, 2));
    }
    catch {
        // Clipboard access may be denied by browser permissions.
    }
}
export async function pasteRootValueFromClipboard(ctx, event) {
    event.preventDefault();
    event.stopPropagation();
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.readText) {
        return;
    }
    try {
        const nextText = await clipboard.readText();
        const parsedValue = JSON.parse(nextText);
        const nextValue = ctx.repair
            ? repairValueForSchema(ctx.rootSchema, parsedValue)
            : parsedValue;
        commitRootValue(ctx, [], nextValue, ctx.rootSchema, "both");
    }
    catch (e) {
        console.error(e);
        if (e instanceof DOMException) {
            alert("Failed to read from clipboard. Please check your browser permissions.");
        }
    }
}
