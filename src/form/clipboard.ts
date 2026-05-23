import type { JsonValue } from "../types.js";
import { repairValueForSchema } from "../schema.js";
import { commitRootValue } from "./state.js";
import type { JsonSchemaFormContext } from "./context.js";

export async function copyRootValueToClipboard(ctx: JsonSchemaFormContext, event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) {
    return;
  }

  try {
    await clipboard.writeText(JSON.stringify(ctx.value ?? null));
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
    const nextValue = ctx.repair
      ? repairValueForSchema(ctx.rootSchema, parsedValue)
      : parsedValue;
    commitRootValue(ctx, [], nextValue, ctx.rootSchema, "both");
  } catch (e) {
    console.error(e);
    if (e instanceof DOMException) {
      alert("Failed to read from clipboard. Please check your browser permissions.");
    }
  }
}

