import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import type { ReferenceGameSourceManifestPayload } from "./schema.js";

type CanonicalReferenceGameJson =
  | null
  | boolean
  | number
  | string
  | CanonicalReferenceGameJson[]
  | { [key: string]: CanonicalReferenceGameJson };

export function computeReferenceGameSourceDigest(
  payload: ReferenceGameSourceManifestPayload,
): `sha256:${string}` {
  const canonical = canonicalizeReferenceGameSourcePayload(payload);
  const encoded = JSON.stringify(canonical);
  return `sha256:${bytesToHex(sha256(utf8ToBytes(encoded)))}`;
}

export function canonicalizeReferenceGameSourcePayload(
  payload: ReferenceGameSourceManifestPayload,
): CanonicalReferenceGameJson {
  return canonicalizeJson({
    ...payload,
    games: [...payload.games].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    objects: [...payload.objects].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  });
}

function canonicalizeJson(value: unknown): CanonicalReferenceGameJson {
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.normalize("NFC");
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        "reference game source JSON contains a non-finite number",
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    for (const [, item] of entries) {
      if (item === undefined) {
        throw new Error("reference game source JSON contains undefined");
      }
    }
    return Object.fromEntries(
      entries
        .map(([key, item]) => [key.normalize("NFC"), item] as const)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeJson(item)]),
    );
  }
  throw new Error(
    `reference game source JSON contains unsupported ${typeof value} value`,
  );
}
