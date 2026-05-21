import type { JsonValue } from "../lib/types.js";
import { emitWholeValue } from "./state.js";
import type { JsonSchemaFormContext } from "./shared.js";
import { Value } from "typebox/value";

export async function copyRootValueToClipboard(ctx: JsonSchemaFormContext, event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) {
    return;
  }

  try {
    await clipboard.writeText(JSON.stringify(ctx.value ?? null, null, 2));
  } catch {
    // Clipboard access may be denied by browser permissions.
  }
}

export async function pasteRootValueFromClipboard(ctx: JsonSchemaFormContext, event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.readText) {
    return;
  }

  try {
    const nextText = await clipboard.readText();
    const parsedValue = JSON.parse(nextText) as JsonValue;
    const sanitizedValue = Value.Repair(ctx.rootSchema, parsedValue) as JsonValue;
    emitWholeValue(ctx, [], sanitizedValue, ctx.rootSchema);
  } catch (e) {
    console.error(e);
    if (e instanceof DOMException) {
      alert("Failed to read from clipboard. Please check your browser permissions.");
    }
  }
}
