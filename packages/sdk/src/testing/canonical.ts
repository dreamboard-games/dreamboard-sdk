import {
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
} from "../shared/protocol/digest.js";
import type { Sha256Digest } from "./inspection/types.js";

export function canonicalScenarioJson(value: unknown): string {
  return encodeCanonicalPluginRuntimeJson(value);
}

export function digestScenarioJson(value: unknown): Sha256Digest {
  return digestPluginRuntimeJson(value) as Sha256Digest;
}

export function compareCanonicalScenarioJson(
  left: unknown,
  right: unknown,
): number {
  const leftJson = canonicalScenarioJson(left);
  const rightJson = canonicalScenarioJson(right);
  return leftJson === rightJson ? 0 : leftJson < rightJson ? -1 : 1;
}
