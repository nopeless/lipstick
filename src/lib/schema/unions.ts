import type { JsonPrimitive, JsonSchema202012, JsonValue } from "../types.js";
import { isJsonObject } from "../value.js";
import { getLiteralBranchValue } from "./internal.js";
import { matchesSchema, resolveSchema } from "./resolution.js";

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

export function describeUnion(
  schema: JsonSchema202012,
  value: JsonValue | undefined,
  root: JsonSchema202012,
  preferredIndex?: number,
): UnionPresentation | undefined {
  const branches = schema.oneOf ?? schema.anyOf;

  if (!branches?.length) {
    return undefined;
  }

  const selectedIndex = preferredIndex ?? pickBestBranchIndex(branches, value, root);

  let unnamedIndex = 0;
  const discriminator = inferDiscriminator(branches, root);

  const literalOptions = branches.map((branch, index) => {
    const preferredLabel = resolveUnionOptionLabel(branch, index, discriminator);
    return {
      index,
      label: preferredLabel ?? `Option ${++unnamedIndex}`,
      literal: getLiteralBranchValue(branch, resolveSchema, root),
    };
  });

  if (
    literalOptions.length === 2 &&
    literalOptions.every((option) => typeof option.literal === "boolean")
  ) {
    return { kind: "boolean", selectedIndex, options: literalOptions };
  }

  if (
    literalOptions.length > 0 &&
    literalOptions.length <= 5 &&
    literalOptions.every((option) => option.literal !== undefined)
  ) {
    return { kind: "enum", selectedIndex, options: literalOptions };
  }

  return { kind: "generic", selectedIndex, options: literalOptions };
}

export function pickBestBranchIndex(
  branches: JsonSchema202012[],
  value: JsonValue | undefined,
  root: JsonSchema202012,
): number {
  const discriminator = inferDiscriminator(branches, root);

  if (discriminator && isJsonObject(value)) {
    const currentValue = value[discriminator.property];
    const match = discriminator.options.find((option) => option.value === currentValue);

    if (match) {
      return match.index;
    }
  }

  for (let index = 0; index < branches.length; index += 1) {
    if (matchesSchema(value, branches[index], root)) {
      return index;
    }
  }

  return 0;
}

export function inferDiscriminator(
  branches: JsonSchema202012[],
  root: JsonSchema202012,
): DiscriminatorInfo | undefined {
  const candidateProperties = new Map<string, Array<{ index: number; value: JsonPrimitive }>>();

  branches.forEach((branch, index) => {
    const resolved = resolveSchema(branch, root, undefined);
    if (!resolved || typeof resolved !== "object" || Array.isArray(resolved)) {
      return;
    }

    const required = new Set(resolved.required ?? []);
    for (const [property, schemaCandidate] of Object.entries(resolved.properties ?? {})) {
      if (!required.has(property)) {
        continue;
      }

      const literal = getLiteralBranchValue(schemaCandidate, resolveSchema, root);
      if (literal === undefined) {
        continue;
      }

      const list = candidateProperties.get(property) ?? [];
      list.push({ index, value: literal });
      candidateProperties.set(property, list);
    }
  });

  for (const [property, entries] of candidateProperties) {
    if (entries.length !== branches.length) {
      continue;
    }

    const uniqueValues = new Set(entries.map((entry) => entry.value));
    if (uniqueValues.size !== branches.length) {
      continue;
    }

    return {
      property,
      options: entries.map((entry) => ({
        index: entry.index,
        value: entry.value,
      })),
    };
  }

  return undefined;
}

function resolveUnionOptionLabel(
  branch: JsonSchema202012,
  index: number,
  discriminator: DiscriminatorInfo | undefined,
): string | undefined {
  if (branch.type === "null") {
    return "null";
  }

  if (branch.description?.trim()) {
    return branch.description?.trim();
  }

  if (discriminator) {
    const discriminatorValue = discriminator.options.find(
      (option) => option.index === index,
    )?.value;
    if (discriminatorValue !== undefined) {
      return String(discriminatorValue);
    }
  }

  return undefined;
}
