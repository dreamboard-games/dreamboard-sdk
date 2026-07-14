import {
  decodeCanonicalCandidateValue,
  encodeCanonicalCandidateValue,
  type CanonicalBrowserInteractionValue,
} from "./canonical.js";
import type {
  BrowserInteractionEffectPattern,
  BrowserInteractionSurfaceEffect,
  GameplaySemanticEffect,
} from "./types.js";

export function encodeBrowserInteractionEffect(
  effect: BrowserInteractionSurfaceEffect,
): string {
  return encodeCanonicalCandidateValue(effect);
}

export function decodeBrowserInteractionEffect(
  encoded: string,
): BrowserInteractionSurfaceEffect {
  const decoded = decodeCanonicalCandidateValue(encoded);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new Error("Browser interaction effect must be a canonical object.");
  }
  const decodedObject = decoded as {
    readonly [key: string]: CanonicalBrowserInteractionValue;
  };
  const kind = decodedObject.kind;
  if (typeof kind !== "string" || kind.length === 0) {
    throw new Error("Browser interaction effect requires a string kind.");
  }
  return decodedObject as BrowserInteractionSurfaceEffect;
}

export function encodeBrowserInteractionEffectPattern(
  pattern: BrowserInteractionEffectPattern,
): string {
  return encodeCanonicalCandidateValue(pattern);
}

export function decodeBrowserInteractionEffectPattern(
  encoded: string,
): BrowserInteractionEffectPattern {
  const decoded = decodeCanonicalCandidateValue(encoded);
  assertBrowserInteractionEffectPattern(decoded);
  return decoded;
}

export function browserInteractionEffectPatternMatches(
  pattern: BrowserInteractionEffectPattern,
  effect: BrowserInteractionSurfaceEffect,
): boolean {
  switch (pattern.kind) {
    case "exact":
      return (
        encodeBrowserInteractionEffect(pattern.effect) ===
        encodeBrowserInteractionEffect(effect)
      );
    case "match": {
      if (effect.kind !== pattern.effectKind) return false;
      for (const [field, expected] of Object.entries(pattern.fields ?? {})) {
        const actual = effect[field];
        if (actual === undefined) return false;
        if (
          encodeCanonicalCandidateValue(actual) !==
          encodeCanonicalCandidateValue(expected)
        ) {
          return false;
        }
      }
      const scalar = pattern.scalar;
      if (scalar) {
        const actual = effect[scalar.field];
        if (typeof actual !== "number" || !Number.isFinite(actual)) {
          return false;
        }
        if (scalar.integer === true && !Number.isInteger(actual)) {
          return false;
        }
        if (scalar.min !== undefined && actual < scalar.min) {
          return false;
        }
        if (scalar.max !== undefined && actual > scalar.max) {
          return false;
        }
      }
      return true;
    }
  }
}

export function assertBrowserInteractionEffectPattern(
  value: unknown,
): asserts value is BrowserInteractionEffectPattern {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Browser interaction effect pattern must be an object.");
  }
  const pattern = value as {
    readonly [key: string]: unknown;
  };
  if (pattern.kind === "exact") {
    decodeBrowserInteractionEffect(
      encodeCanonicalCandidateValue(pattern.effect),
    );
    return;
  }
  if (pattern.kind === "match") {
    if (
      typeof pattern.effectKind !== "string" ||
      pattern.effectKind.length === 0
    ) {
      throw new Error(
        "Browser interaction match pattern requires an effectKind.",
      );
    }
    if (pattern.fields !== undefined) {
      if (
        !pattern.fields ||
        typeof pattern.fields !== "object" ||
        Array.isArray(pattern.fields)
      ) {
        throw new Error(
          "Browser interaction match pattern fields must be an object.",
        );
      }
    }
    if (pattern.scalar !== undefined) {
      if (
        !pattern.scalar ||
        typeof pattern.scalar !== "object" ||
        Array.isArray(pattern.scalar) ||
        typeof (pattern.scalar as { readonly field?: unknown }).field !==
          "string" ||
        (pattern.scalar as { readonly field: string }).field.length === 0
      ) {
        throw new Error(
          "Browser interaction scalar pattern requires a scalar field.",
        );
      }
    }
    return;
  }
  throw new Error("Unknown browser interaction effect pattern kind.");
}

export function gameplaySetCandidateEffect(input: {
  readonly inputKey: string;
  readonly candidateValue: CanonicalBrowserInteractionValue;
  readonly beforeSelected: boolean;
  readonly afterSelected: boolean;
}): GameplaySemanticEffect {
  return { kind: "setCandidate", ...input };
}

export function gameplayAdjustResourceEffect(input: {
  readonly inputKey: string;
  readonly resourceKey: CanonicalBrowserInteractionValue;
  readonly delta: -1 | 1;
}): GameplaySemanticEffect {
  return { kind: "adjustResource", ...input };
}

export function gameplaySetScalarEffect(input: {
  readonly inputKey: string;
  readonly value: number;
}): GameplaySemanticEffect {
  return { kind: "setScalar", ...input };
}

export function gameplayCommitEffect(): GameplaySemanticEffect {
  return { kind: "commit" };
}

export function gameplayInvokeEffect(): GameplaySemanticEffect {
  return { kind: "invoke" };
}
