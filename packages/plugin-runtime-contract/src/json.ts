import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type RuntimeJson =
  | null
  | boolean
  | number
  | string
  | RuntimeJson[]
  | { [key: string]: RuntimeJson };

export type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

export function canonicalizePluginRuntimeJson(value: unknown): CanonicalJson {
  assertRuntimeJson(value);
  return canonicalizeJson(value);
}

export function encodeCanonicalPluginRuntimeJson(value: unknown): string {
  return JSON.stringify(canonicalizePluginRuntimeJson(value));
}

export function digestPluginRuntimeJson(value: unknown): string {
  return `sha256:${sha256Hex(encodeCanonicalPluginRuntimeJson(value))}`;
}

function canonicalizeJson(value: RuntimeJson): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON contains a non-finite number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, canonicalizeJson(item)]),
  );
}

function assertRuntimeJson(value: unknown): asserts value is RuntimeJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("runtime JSON contains a non-finite number");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertRuntimeJson);
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => {
      if (item !== undefined) {
        assertRuntimeJson(item);
      }
    });
    return;
  }
  throw new Error(`runtime JSON contains unsupported ${typeof value} value`);
}

function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8ToBytes(input)));
}
