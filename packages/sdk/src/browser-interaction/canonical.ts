import { parseBrowserAttributeJson } from "../runtime-json.js";

export type CanonicalBrowserInteractionValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalBrowserInteractionValue[]
  | { readonly [key: string]: CanonicalBrowserInteractionValue };

function assertCanonicalValue(
  value: unknown,
): asserts value is CanonicalBrowserInteractionValue {
  if (value === null) return;
  switch (typeof value) {
    case "boolean":
    case "string":
      return;
    case "number":
      if (Number.isFinite(value)) return;
      break;
    case "object":
      if (Array.isArray(value)) {
        value.forEach(assertCanonicalValue);
        return;
      }
      if (Object.getPrototypeOf(value) !== Object.prototype) break;
      for (const [key, item] of Object.entries(value)) {
        if (item === undefined) {
          throw new Error(
            `Browser interaction candidate '${key}' cannot be undefined.`,
          );
        }
        assertCanonicalValue(item);
      }
      return;
  }
  throw new Error(
    `Browser interaction candidates must be JSON-serializable primitives, arrays or plain objects. Received ${typeof value}.`,
  );
}

function canonicalizeValue(
  value: CanonicalBrowserInteractionValue,
): CanonicalBrowserInteractionValue {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value && typeof value === "object") {
    const objectValue = value as {
      readonly [key: string]: CanonicalBrowserInteractionValue;
    };
    return Object.fromEntries(
      Object.keys(objectValue)
        .sort()
        .map((key) => [key, canonicalizeValue(objectValue[key])]),
    );
  }
  return value;
}

export function encodeCanonicalCandidateValue(value: unknown): string {
  parseBrowserAttributeJson(value);
  assertCanonicalValue(value);
  return JSON.stringify(canonicalizeValue(value));
}

export function decodeCanonicalCandidateValue(
  encoded: string,
): CanonicalBrowserInteractionValue {
  const parsed = JSON.parse(encoded) as unknown;
  parseBrowserAttributeJson(parsed);
  assertCanonicalValue(parsed);
  return canonicalizeValue(parsed);
}

export function compareStableJson(a: unknown, b: unknown): number {
  const encodedA = encodeCanonicalCandidateValue(a);
  const encodedB = encodeCanonicalCandidateValue(b);
  return encodedA.localeCompare(encodedB);
}
