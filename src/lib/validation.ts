import Schema from "typebox/schema";
import type { TLocalizedValidationError } from "typebox/error";
import type { TSchema, JsonValue } from "./types.js";

export interface ValidationIssue {
  keyword: string;
  instancePath: string;
  message: string;
}

export interface ValidationSnapshot {
  valid: boolean;
  issues: ValidationIssue[];
  fieldMessages: Map<string, string[]>;
  schemaError?: string;
}

export const DRAFT_2020_12_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";

const validatorCache = new WeakMap<TSchema, ReturnType<typeof Schema.Compile>>();
const validatorErrorCache = new WeakMap<TSchema, string>();

export function validateValueAgainstSchema(
  schema: TSchema,
  value: JsonValue | undefined,
): ValidationSnapshot {
  const validator = getValidator(schema);

  if (!validator) {
    return {
      valid: false,
      issues: [],
      fieldMessages: new Map(),
      schemaError:
        validatorErrorCache.get(schema) ?? "Unable to compile JSON Schema for validation.",
    };
  }

  const [valid, errors] = validator.Errors(value);
  const issues = toIssues(errors);
  return {
    valid,
    issues,
    fieldMessages: toFieldMessages(issues),
  };
}

export function getFieldMessagesForSchema(
  schema: TSchema,
  value: JsonValue | undefined,
): Map<string, string[]> {
  const validator = getValidator(schema);
  if (!validator) {
    return new Map();
  }

  const [, errors] = validator.Errors(value);
  return toFieldMessages(toIssues(errors));
}

function getValidator(schema: TSchema): ReturnType<typeof Schema.Compile> | undefined {
  const cached = validatorCache.get(schema);
  if (cached) {
    return cached;
  }

  try {
    const validator = Schema.Compile(schema);
    validatorCache.set(schema, validator);
    validatorErrorCache.delete(schema);
    return validator;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    validatorErrorCache.set(schema, message);
    return undefined;
  }
}

function toIssues(errors: TLocalizedValidationError[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const error of errors) {
    const pointers = expandErrorPointers(error);

    for (const pointer of pointers) {
      issues.push({
        keyword: error.keyword,
        instancePath: pointer,
        message: error.message,
      });
    }
  }

  return issues;
}

function toFieldMessages(issues: ValidationIssue[]): Map<string, string[]> {
  const fieldMessages = new Map<string, string[]>();

  for (const issue of issues) {
    const key = pointerToPathKey(issue.instancePath);
    const list = fieldMessages.get(key) ?? [];

    if (!list.includes(issue.message)) {
      fieldMessages.set(key, [...list, issue.message]);
    }
  }

  return fieldMessages;
}

function expandErrorPointers(error: TLocalizedValidationError): string[] {
  if (error.keyword === "required") {
    const requiredProperties = readStringList(
      (error.params as { requiredProperties?: unknown }).requiredProperties,
    );

    if (requiredProperties.length > 0) {
      return requiredProperties.map((property) => appendPointer(error.instancePath, property));
    }
  }

  if (error.keyword === "dependentRequired" || error.keyword === "dependencies") {
    const dependencies = readStringList((error.params as { dependencies?: unknown }).dependencies);

    if (dependencies.length > 0) {
      return dependencies.map((property) => appendPointer(error.instancePath, property));
    }
  }

  return [error.instancePath];
}

function readStringList(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.filter((value): value is string => typeof value === "string");
}

function appendPointer(basePointer: string, segment: string): string {
  const safeSegment = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  if (!basePointer) {
    return `/${safeSegment}`;
  }
  return `${basePointer}/${safeSegment}`;
}

function pointerToPathKey(pointer: string): string {
  return pointer ? `#${pointer}` : "#";
}

