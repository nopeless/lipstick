import type { JsonSchema, JsonValue } from "./types.js";
import { evaluateSchema, findUnsupportedRef, type SchemaEvaluationIssue } from "./schema.js";

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

export function validateValueAgainstSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
): ValidationSnapshot {
  const unsupportedRefPath = findUnsupportedRef(schema);
  if (unsupportedRefPath) {
    return {
      valid: false,
      issues: [],
      fieldMessages: new Map(),
      schemaError: `$ref is not supported in this version of Lipstick (${unsupportedRefPath}).`,
    };
  }

  const result = evaluateSchema(schema, value, schema);
  const issues = toIssues(result.issues);
  return {
    valid: result.valid,
    issues,
    fieldMessages: toFieldMessages(issues),
  };
}

export function getFieldMessagesForSchema(
  schema: JsonSchema,
  value: JsonValue | undefined,
): Map<string, string[]> {
  if (findUnsupportedRef(schema)) {
    return new Map();
  }

  return toFieldMessages(toIssues(evaluateSchema(schema, value, schema).issues));
}

function toIssues(errors: SchemaEvaluationIssue[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const error of errors) {
    issues.push({
      keyword: error.keyword,
      instancePath: normalizePointer(error.instancePath),
      message: error.message,
    });
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

function pointerToPathKey(pointer: string): string {
  return pointer.startsWith("#") ? pointer : `#${pointer}`;
}

function normalizePointer(pointer: string): string {
  return pointer === "#" ? "#" : pointer.replace(/^#/, "");
}

