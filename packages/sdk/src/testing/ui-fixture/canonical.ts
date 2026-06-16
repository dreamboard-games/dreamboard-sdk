import { createHash } from "node:crypto";
import type { UIReplayRequest, UIScenarioFixture } from "./schema.js";

type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

const sha256DigestPattern = /^sha256:[a-f0-9]{64}$/;

export function isSha256Digest(value: string): boolean {
  return sha256DigestPattern.test(value);
}

export function canonicalizeUIFixtureJson(value: unknown): CanonicalJson {
  if (value === null) {
    return null;
  }
  switch (typeof value) {
    case "boolean":
    case "string":
      return value;
    case "number":
      if (Number.isFinite(value)) {
        return value;
      }
      break;
    case "object": {
      if (Array.isArray(value)) {
        return value.map((item) => canonicalizeUIFixtureJson(item));
      }
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        break;
      }
      const entries = Object.entries(value as Record<string, unknown>);
      return Object.fromEntries(
        entries
          .filter(([, item]) => item !== undefined)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, canonicalizeUIFixtureJson(item)]),
      );
    }
  }
  throw new Error(
    `UI fixture values must be deterministic JSON. Received ${typeof value}.`,
  );
}

export function canonicalUIFixtureJson(value: unknown): string {
  return JSON.stringify(canonicalizeUIFixtureJson(value));
}

export function digestUIFixtureJson(value: unknown): string {
  return sha256(canonicalUIFixtureJson(value));
}

export function digestUIFixtureRequest(request: UIReplayRequest): string {
  return digestUIFixtureJson({
    digestVersion: "ui-replay-request@1",
    request,
  });
}

export function digestUIFixtureTransportRequest(request: {
  readonly operation: "validate" | "submit" | "refresh";
  readonly playerId?: string;
  readonly interactionId?: string;
  readonly payload?: unknown;
}): string {
  return digestUIFixtureJson({
    digestVersion: "ui-fixture-transport-request@1",
    request,
  });
}

export function canonicalizeUIScenarioFixture(
  fixture: UIScenarioFixture,
): UIScenarioFixture {
  return canonicalizeUIFixtureJson({
    ...fixture,
    tags: [...fixture.tags].sort(),
    environment: {
      ...fixture.environment,
      viewportTags: [...fixture.environment.viewportTags].sort(),
    },
  }) as unknown as UIScenarioFixture;
}

export function serializeUIScenarioFixture(fixture: UIScenarioFixture): string {
  return `${JSON.stringify(canonicalizeUIScenarioFixture(fixture), null, 2)}\n`;
}

export function digestUIScenarioFixture(fixture: UIScenarioFixture): string {
  return sha256(serializeUIScenarioFixture(fixture));
}

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
