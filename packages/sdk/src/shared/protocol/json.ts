import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { RuntimeJsonSchema, type RuntimeJson } from "../runtime-json.js";

export function canonicalizePluginRuntimeJson(value: unknown): RuntimeJson {
  return canonicalizeJson(
    RuntimeJsonSchema.parse(omitOptionalProperties(value)),
  );
}

export function encodeCanonicalPluginRuntimeJson(value: unknown): string {
  return JSON.stringify(canonicalizePluginRuntimeJson(value));
}

export function digestPluginRuntimeJson(value: unknown): string {
  return `sha256:${sha256Hex(encodeCanonicalPluginRuntimeJson(value))}`;
}

function canonicalizeJson(value: RuntimeJson): RuntimeJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, canonicalizeJson(item)]),
  );
}

// Authored descriptors may explicitly carry undefined optional properties.
// Omit only those JSON object fields; z.json rejects every other unsupported value.
function omitOptionalProperties(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitOptionalProperties);
  if (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, omitOptionalProperties(item)]),
    );
  }
  return value;
}

function sha256Hex(input: string): string {
  return bytesToHex(sha256(utf8ToBytes(input)));
}
