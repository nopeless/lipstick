import type { JsonPointerPath, JsonValue } from "./types.js";

export function cloneJsonValue<T extends JsonValue>(value: T): T {
  return structuredClone(value);
}

export function isJsonObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getValueAtPath(
  value: JsonValue | undefined,
  path: JsonPointerPath,
): JsonValue | undefined {
  let cursor = value;

  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor)) {
        return undefined;
      }

      cursor = cursor[segment];
      continue;
    }

    if (!isJsonObject(cursor)) {
      return undefined;
    }

    cursor = cursor[segment];
  }

  return cursor;
}

export function setValueAtPath(
  current: JsonValue | undefined,
  path: JsonPointerPath,
  nextValue: JsonValue,
): JsonValue {
  if (path.length === 0) {
    return cloneJsonValue(nextValue);
  }

  const [head, ...tail] = path;

  if (typeof head === "number") {
    const source = Array.isArray(current) ? current : [];
    const next = [...source];
    next[head] = setValueAtPath(source[head], tail, nextValue);
    return next;
  }

  const source = isJsonObject(current) ? current : {};
  return {
    ...source,
    [head]: setValueAtPath(source[head], tail, nextValue),
  };
}

export function deleteValueAtPath(
  current: JsonValue | undefined,
  path: JsonPointerPath,
): JsonValue {
  if (path.length === 0 || current === undefined) {
    return current ?? null;
  }

  const [head, ...tail] = path;

  if (typeof head === "number") {
    if (!Array.isArray(current)) {
      return current;
    }

    if (tail.length === 0) {
      return current.filter((_, index) => index !== head);
    }

    const next = [...current];
    next[head] = deleteValueAtPath(current[head], tail);
    return next;
  }

  if (!isJsonObject(current)) {
    return current;
  }

  if (tail.length === 0) {
    const { [head]: _removed, ...rest } = current;
    return rest;
  }

  return {
    ...current,
    [head]: deleteValueAtPath(current[head], tail),
  };
}

export function moveArrayItem(
  current: JsonValue | undefined,
  path: JsonPointerPath,
  fromIndex: number,
  toIndex: number,
): JsonValue {
  const existing = getValueAtPath(current, path);

  if (!Array.isArray(existing)) {
    return current ?? null;
  }

  const next = [...existing];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);

  return setValueAtPath(current, path, next);
}
