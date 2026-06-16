import { z } from "zod";

export type RuntimeJson =
  | null
  | boolean
  | number
  | string
  | RuntimeJson[]
  | { [key: string]: RuntimeJson };

export type JsonLimits = {
  maxDepth: number;
  maxNodes: number;
  maxStringBytes: number;
  maxCollectionEntries: number;
};

export type JsonValidationCode =
  | "cycle"
  | "depth"
  | "nodes"
  | "string-bytes"
  | "collection-entries"
  | "non-json";

export class JsonValidationError extends Error {
  constructor(
    public readonly code: JsonValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "JsonValidationError";
  }
}

export const TRANSPORT_JSON_LIMITS = {
  maxDepth: 64,
  maxNodes: 100_000,
  maxStringBytes: 1_048_576,
  maxCollectionEntries: 50_000,
} as const satisfies JsonLimits;

export const BROWSER_ATTRIBUTE_JSON_LIMITS = {
  maxDepth: 32,
  maxNodes: 10_000,
  maxStringBytes: 65_536,
  maxCollectionEntries: 5_000,
} as const satisfies JsonLimits;

function jsonError(
  code: JsonValidationCode,
  label: string,
  detail: string,
): JsonValidationError {
  return new JsonValidationError(code, `${label} ${detail}.`);
}

function requirePlainObject(
  value: object,
  label: string,
): Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw jsonError("non-json", label, "contains a non-plain object");
  }
  return value as Record<string, unknown>;
}

export function assertJsonWithinLimits(
  root: unknown,
  limits: JsonLimits,
  label: string,
): void {
  const stack: Array<{ value: unknown; depth: number }> = [
    { value: root, depth: 0 },
  ];
  const seen = new WeakSet<object>();
  const encoder = new TextEncoder();
  let nodes = 0;
  let stringBytes = 0;
  let collectionEntries = 0;

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) continue;
    const { value, depth } = item;

    nodes += 1;
    if (nodes > limits.maxNodes) {
      throw jsonError("nodes", label, "exceeds the node limit");
    }
    if (depth > limits.maxDepth) {
      throw jsonError("depth", label, "exceeds the depth limit");
    }

    switch (typeof value) {
      case "string":
        stringBytes += encoder.encode(value).byteLength;
        if (stringBytes > limits.maxStringBytes) {
          throw jsonError(
            "string-bytes",
            label,
            "exceeds the string-byte limit",
          );
        }
        continue;
      case "number":
        if (!Number.isFinite(value)) {
          throw jsonError("non-json", label, "contains a non-finite number");
        }
        continue;
      case "boolean":
        continue;
      case "object":
        if (value === null) continue;
        break;
      default:
        throw jsonError("non-json", label, "contains a non-JSON value");
    }

    if (seen.has(value)) {
      throw jsonError("cycle", label, "contains a cycle");
    }
    seen.add(value);

    const children = Array.isArray(value)
      ? value
      : Object.values(requirePlainObject(value, label));
    collectionEntries += children.length;
    if (collectionEntries > limits.maxCollectionEntries) {
      throw jsonError(
        "collection-entries",
        label,
        "exceeds the collection-entry limit",
      );
    }
    for (const child of children) {
      stack.push({ value: child, depth: depth + 1 });
    }
  }
}

export const RuntimeJsonSchema: z.ZodType<RuntimeJson> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(RuntimeJsonSchema),
    z.record(z.string(), RuntimeJsonSchema),
  ]),
);

export function parseJsonWithLimits(
  value: unknown,
  limits: JsonLimits,
  label: string,
): RuntimeJson {
  assertJsonWithinLimits(value, limits, label);
  return RuntimeJsonSchema.parse(value);
}

export function parseTransportJson(value: unknown): RuntimeJson {
  return parseJsonWithLimits(value, TRANSPORT_JSON_LIMITS, "Runtime payload");
}

export function parseBrowserAttributeJson(value: unknown): RuntimeJson {
  return parseJsonWithLimits(
    value,
    BROWSER_ATTRIBUTE_JSON_LIMITS,
    "Browser interaction attribute",
  );
}
