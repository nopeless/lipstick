import type { JsonSchema, JsonValue } from "../types.js";
import { isJsonObject } from "../value.js";
import {
  getJsonValueType,
  jsonValueEquals,
  matchesType,
} from "./internal.js";

export interface SchemaEvaluationIssue {
  keyword: string;
  instancePath: string;
  message: string;
}

export interface EvaluationOptions {
  collectAll?: boolean;
}

interface EvaluationState {
  root: JsonSchema;
  issues: SchemaEvaluationIssue[];
  collectAll: boolean;
}

export function isValueValidAgainstSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
  root: JsonSchema,
): boolean {
  return evaluateSchema(schema, value, root, { collectAll: false }).valid;
}

export function evaluateSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
  root: JsonSchema,
  options: EvaluationOptions = {},
): { valid: boolean; issues: SchemaEvaluationIssue[] } {
  const state: EvaluationState = {
    root,
    issues: [],
    collectAll: options.collectAll ?? true,
  };

  try {
    validateSchema(schema, value, "#", state);
  } catch (error) {
    if (error !== SHORT_CIRCUIT) {
      throw error;
    }
  }

  return {
    valid: state.issues.length === 0,
    issues: state.issues,
  };
}

function validateSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
): boolean {
  const issueStart = state.issues.length;

  if (schema.type && !matchesType(value, schema.type, getJsonValueType)) {
    addIssue(state, "type", path, `Expected ${formatType(schema.type)}.`);
  }

  if (schema.const !== undefined && !jsonValueEquals(value, schema.const)) {
    addIssue(state, "const", path, `Expected ${formatJsonValue(schema.const)}.`);
  }

  if (schema.enum && !schema.enum.some((option) => jsonValueEquals(value, option))) {
    addIssue(state, "enum", path, "Expected one of the allowed values.");
  }

  validateComposition(schema, value, path, state);
  validateObjectKeywords(schema, value, path, state);
  validateArrayKeywords(schema, value, path, state);
  validateStringKeywords(schema, value, path, state);
  validateNumberKeywords(schema, value, path, state);

  return state.issues.length === issueStart;
}

function validateComposition(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
) {
  if (schema.allOf) {
    for (const branch of schema.allOf) {
      validateSchema(branch, value, path, state);
    }
  }

  if (schema.anyOf?.length) {
    const matches = schema.anyOf.some((branch) => validateSilently(branch, value, state.root));
    if (!matches) {
      addIssue(state, "anyOf", path, "Expected to match at least one variant.");
    }
  }

  if (schema.oneOf?.length) {
    const matchCount = schema.oneOf.filter((branch) =>
      validateSilently(branch, value, state.root),
    ).length;
    if (matchCount !== 1) {
      addIssue(state, "oneOf", path, "Expected to match exactly one variant.");
    }
  }

  if (schema.if) {
    const branch = validateSilently(schema.if, value, state.root) ? schema.then : schema.else;
    if (branch) {
      validateSchema(branch, value, path, state);
    }
  }
}

function validateObjectKeywords(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
) {
  if (!isJsonObject(value)) {
    return;
  }

  for (const property of schema.required ?? []) {
    if (!(property in value)) {
      addIssue(
        state,
        "required",
        appendPointer(path, property),
        "Required property is missing.",
      );
    }
  }

  const properties = schema.properties ?? {};
  for (const [property, propertySchema] of Object.entries(properties)) {
    if (property in value) {
      validateSchema(propertySchema, value[property], appendPointer(path, property), state);
    }
  }

  const additionalProperties = schema.additionalProperties;
  if (additionalProperties !== undefined) {
    for (const [property, propertyValue] of Object.entries(value)) {
      if (property in properties || matchesPatternProperty(schema, property)) {
        continue;
      }

      const propertyPath = appendPointer(path, property);
      if (additionalProperties === false) {
        addIssue(state, "additionalProperties", propertyPath, "Unexpected property.");
      } else if (typeof additionalProperties === "object" && additionalProperties !== null) {
        validateSchema(additionalProperties, propertyValue, propertyPath, state);
      }
    }
  }

  for (const [pattern, patternSchema] of Object.entries(schema.patternProperties ?? {})) {
    const regex = compilePattern(pattern);
    if (!regex) {
      continue;
    }

    for (const [property, propertyValue] of Object.entries(value)) {
      if (regex.test(property)) {
        validateSchema(patternSchema, propertyValue, appendPointer(path, property), state);
      }
    }
  }

  for (const [dependency, requiredProperties] of Object.entries(schema.dependentRequired ?? {})) {
    if (!(dependency in value)) {
      continue;
    }

    for (const property of requiredProperties) {
      if (!(property in value)) {
        addIssue(
          state,
          "dependentRequired",
          appendPointer(path, property),
          `Required when ${dependency} is present.`,
        );
      }
    }
  }

  for (const [dependency, dependentSchema] of Object.entries(schema.dependentSchemas ?? {})) {
    if (dependency in value) {
      validateSchema(dependentSchema, value, path, state);
    }
  }
}

function validateArrayKeywords(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
) {
  if (!Array.isArray(value)) {
    return;
  }

  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    addIssue(state, "minItems", path, `Expected at least ${schema.minItems} item(s).`);
  }

  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
    addIssue(state, "maxItems", path, `Expected at most ${schema.maxItems} item(s).`);
  }

  const prefixLength = schema.prefixItems?.length ?? 0;
  for (let index = 0; index < value.length; index += 1) {
    const itemSchema = schema.prefixItems?.[index];
    if (itemSchema) {
      validateSchema(itemSchema, value[index], appendPointer(path, String(index)), state);
      continue;
    }

    if (schema.items === false) {
      addIssue(state, "items", appendPointer(path, String(index)), "Unexpected tuple item.");
      continue;
    }

    if (typeof schema.items === "object" && schema.items !== null && index >= prefixLength) {
      validateSchema(schema.items, value[index], appendPointer(path, String(index)), state);
    }
  }
}

function validateStringKeywords(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
) {
  if (typeof value !== "string") {
    return;
  }

  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    addIssue(state, "minLength", path, `Expected at least ${schema.minLength} character(s).`);
  }

  if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
    addIssue(state, "maxLength", path, `Expected at most ${schema.maxLength} character(s).`);
  }

  if (schema.pattern) {
    const regex = compilePattern(schema.pattern);
    if (regex && !regex.test(value)) {
      addIssue(state, "pattern", path, "Expected to match the required pattern.");
    }
  }

  if (schema.format && !matchesFormat(schema.format, value)) {
    addIssue(state, "format", path, `Expected ${schema.format} format.`);
  }
}

function validateNumberKeywords(
  schema: JsonSchema,
  value: JsonValue | undefined,
  path: string,
  state: EvaluationState,
) {
  if (typeof value !== "number") {
    return;
  }

  if (typeof schema.minimum === "number" && value < schema.minimum) {
    addIssue(state, "minimum", path, `Expected at least ${schema.minimum}.`);
  }

  if (typeof schema.maximum === "number" && value > schema.maximum) {
    addIssue(state, "maximum", path, `Expected at most ${schema.maximum}.`);
  }

  if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
    addIssue(state, "exclusiveMinimum", path, `Expected more than ${schema.exclusiveMinimum}.`);
  }

  if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) {
    addIssue(state, "exclusiveMaximum", path, `Expected less than ${schema.exclusiveMaximum}.`);
  }

  if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
    const quotient = value / schema.multipleOf;
    if (Math.abs(Math.round(quotient) - quotient) > Number.EPSILON * 100) {
      addIssue(state, "multipleOf", path, `Expected a multiple of ${schema.multipleOf}.`);
    }
  }
}

function validateSilently(
  schema: JsonSchema,
  value: JsonValue | undefined,
  root: JsonSchema,
): boolean {
  return evaluateSchema(schema, value, root, { collectAll: false }).valid;
}

function addIssue(
  state: EvaluationState,
  keyword: string,
  instancePath: string,
  message: string,
) {
  state.issues.push({ keyword, instancePath, message });
  if (!state.collectAll) {
    throwIfShortCircuit();
  }
}

function throwIfShortCircuit(): never {
  throw SHORT_CIRCUIT;
}

const SHORT_CIRCUIT = new Error("schema evaluation short circuit");

function appendPointer(basePointer: string, segment: string): string {
  const safeSegment = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  if (basePointer === "#") {
    return `#/${safeSegment}`;
  }
  return `${basePointer}/${safeSegment}`;
}

function formatType(type: JsonSchema["type"]): string {
  return Array.isArray(type) ? type.join(" or ") : String(type);
}

function formatJsonValue(value: JsonValue): string {
  return JSON.stringify(value);
}

function compilePattern(pattern: string): RegExp | undefined {
  try {
    return new RegExp(pattern);
  } catch {
    return undefined;
  }
}

function matchesPatternProperty(schema: JsonSchema, property: string): boolean {
  for (const pattern of Object.keys(schema.patternProperties ?? {})) {
    const regex = compilePattern(pattern);
    if (regex?.test(property)) {
      return true;
    }
  }

  return false;
}

function matchesFormat(format: string, value: string): boolean {
  switch (format) {
    case "color":
      return /^#[\da-f]{6}$/i.test(value);
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00Z`).getTime());
    case "date-time":
      return Number.isFinite(new Date(value).getTime());
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case "uri":
    case "url":
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    default:
      return true;
  }
}
