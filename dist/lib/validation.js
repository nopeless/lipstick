import Schema from "typebox/schema";
export const DRAFT_2020_12_SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";
const validatorCache = new WeakMap();
const validatorErrorCache = new WeakMap();
export function validateValueAgainstSchema(schema, value) {
    const validator = getValidator(schema);
    if (!validator) {
        return {
            valid: false,
            issues: [],
            fieldMessages: new Map(),
            schemaError: validatorErrorCache.get(schema) ?? "Unable to compile JSON Schema for validation.",
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
export function getFieldMessagesForSchema(schema, value) {
    const validator = getValidator(schema);
    if (!validator) {
        return new Map();
    }
    const [, errors] = validator.Errors(value);
    return toFieldMessages(toIssues(errors));
}
function getValidator(schema) {
    const cached = validatorCache.get(schema);
    if (cached) {
        return cached;
    }
    try {
        const validator = Schema.Compile(schema);
        validatorCache.set(schema, validator);
        validatorErrorCache.delete(schema);
        return validator;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        validatorErrorCache.set(schema, message);
        return undefined;
    }
}
function toIssues(errors) {
    const issues = [];
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
function expandErrorPointers(error) {
    if (error.keyword === "required") {
        const requiredProperties = readStringList(error.params.requiredProperties);
        if (requiredProperties.length > 0) {
            return requiredProperties.map((property) => appendPointer(error.instancePath, property));
        }
    }
    if (error.keyword === "dependentRequired" || error.keyword === "dependencies") {
        const dependencies = readStringList(error.params.dependencies);
        if (dependencies.length > 0) {
            return dependencies.map((property) => appendPointer(error.instancePath, property));
        }
    }
    return [error.instancePath];
}
function readStringList(candidate) {
    if (!Array.isArray(candidate)) {
        return [];
    }
    return candidate.filter((value) => typeof value === "string");
}
function appendPointer(basePointer, segment) {
    const safeSegment = segment.replaceAll("~", "~0").replaceAll("/", "~1");
    if (!basePointer) {
        return `/${safeSegment}`;
    }
    return `${basePointer}/${safeSegment}`;
}
function pointerToPathKey(pointer) {
    return pointer ? `#${pointer}` : "#";
}
