import { evaluateSchema, findUnsupportedRef } from "./schema.js";
export function validateValueAgainstSchema(schema, value) {
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
export function getFieldMessagesForSchema(schema, value) {
    if (findUnsupportedRef(schema)) {
        return new Map();
    }
    return toFieldMessages(toIssues(evaluateSchema(schema, value, schema).issues));
}
function toIssues(errors) {
    const issues = [];
    for (const error of errors) {
        issues.push({
            keyword: error.keyword,
            instancePath: normalizePointer(error.instancePath),
            message: error.message,
        });
    }
    return issues;
}
function toFieldMessages(issues) {
    const fieldMessages = new Map();
    for (const issue of issues) {
        const key = pointerToPathKey(issue.instancePath);
        const list = fieldMessages.get(key) ?? [];
        if (!list.includes(issue.message)) {
            fieldMessages.set(key, [...list, issue.message]);
        }
    }
    return fieldMessages;
}
function pointerToPathKey(pointer) {
    return pointer.startsWith("#") ? pointer : `#${pointer}`;
}
function normalizePointer(pointer) {
    return pointer === "#" ? "#" : pointer.replace(/^#/, "");
}
