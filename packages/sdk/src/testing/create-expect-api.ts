import { isDeepStrictEqual } from "node:util";
import type {
  ExpectFn,
  ExpectMatchers,
  InteractionDescriptorLike,
  RejectionExpectation,
  InteractionExplanationLike,
  SnapshotMatcherHandler,
} from "./definitions.js";
import type { ReducerDiagnosticEvent } from "../reducer/diagnostics.js";

type CreateExpectApiOptions = {
  matchSnapshot?: SnapshotMatcherHandler;
  lastDiagnosticRejection?: () =>
    | Extract<ReducerDiagnosticEvent, { type: "submitRejected" }>
    | null
    | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchPartial(
  actual: unknown,
  expected: unknown,
  path: string = "value",
): string | null {
  if (!isRecord(expected)) {
    return isDeepStrictEqual(actual, expected)
      ? null
      : `${path} does not match`;
  }
  if (!isRecord(actual)) {
    return `${path} is not an object`;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (!(key in actual)) {
      return `${path}.${key} is missing`;
    }
    const mismatch = matchPartial(actualValue, expectedValue, `${path}.${key}`);
    if (mismatch) {
      return mismatch;
    }
  }
  return null;
}

function asDescriptorList(actual: unknown): InteractionDescriptorLike[] {
  if (!Array.isArray(actual)) {
    throw new Error("Expected interaction descriptor array.");
  }
  return actual as InteractionDescriptorLike[];
}

function findInteraction(
  descriptors: readonly InteractionDescriptorLike[],
  interactionId: string,
): InteractionDescriptorLike | null {
  return (
    descriptors.find(
      (descriptor) => descriptor.interactionId === interactionId,
    ) ?? null
  );
}

function assertDescriptorMatches(
  descriptor: InteractionDescriptorLike,
  opts: Partial<InteractionDescriptorLike> | undefined,
): void {
  if (!opts) {
    return;
  }
  const mismatch = matchPartial(descriptor, opts, "interaction");
  if (mismatch) {
    throw new Error(mismatch);
  }
}

function createSubmissionErrorMatcher(
  actual: unknown,
  expected: RejectionExpectation,
  options: CreateExpectApiOptions,
): Promise<void> {
  const resolvePromise = (): Promise<unknown> => {
    if (typeof actual === "function") {
      return Promise.resolve().then(() => (actual as () => unknown)());
    }
    return Promise.resolve(actual);
  };

  return resolvePromise()
    .then(() => {
      throw new Error("Expected promise to reject.");
    })
    .catch((error: unknown) => {
      if (!(error instanceof Error)) {
        throw new Error("Expected rejection to be an Error.");
      }
      if (
        expected.errorCode !== undefined &&
        (error as Error & { errorCode?: string }).errorCode !==
          expected.errorCode
      ) {
        throw new Error(
          `Expected rejection errorCode '${expected.errorCode}', received '${
            (error as Error & { errorCode?: string }).errorCode ?? "undefined"
          }'.${formatLastDiagnosticRejection(options)}`,
        );
      }
      if (
        typeof expected.message === "string" &&
        error.message !== expected.message
      ) {
        throw new Error(
          `Expected rejection message '${expected.message}', received '${error.message}'.${formatLastDiagnosticRejection(
            options,
          )}`,
        );
      }
      if (
        expected.message instanceof RegExp &&
        !expected.message.test(error.message)
      ) {
        throw new Error(
          `Expected rejection message '${error.message}' to match ${String(
            expected.message,
          )}.${formatLastDiagnosticRejection(options)}`,
        );
      }
    });
}

function formatLastDiagnosticRejection(
  options: CreateExpectApiOptions,
): string {
  const rejection = options.lastDiagnosticRejection?.();
  if (!rejection) return "";
  const rule = rejection.ruleId ? ` ruleId=${rejection.ruleId}` : "";
  const message = rejection.message ? ` message=${rejection.message}` : "";
  return `\nlast rejection: errorCode=${rejection.errorCode}${rule}${message}`;
}

function assertLength(actual: unknown, expected: number): void {
  if (
    actual === null ||
    actual === undefined ||
    typeof (actual as { length?: unknown }).length !== "number"
  ) {
    throw new Error("toHaveLength expects a value with a numeric length.");
  }
  const length = (actual as { length: number }).length;
  if (length !== expected) {
    throw new Error(`Expected length ${expected}, received ${length}.`);
  }
}

function formatInteractionExplanation(
  explanation: InteractionExplanationLike | undefined,
): string {
  if (!explanation) {
    return "";
  }
  const lines = [
    `availability: ${explanation.availability}`,
    ...explanation.rules.map((rule) => {
      const code = rule.errorCode ? ` (${rule.errorCode})` : "";
      const message = rule.message ? `: ${rule.message}` : "";
      return `rule ${rule.ruleId} ${rule.outcome}${code}${message}`;
    }),
    ...explanation.inputs.map(
      (input) => `input ${input.key} eligibleCount=${input.eligibleCount}`,
    ),
  ];
  return `\n${lines.join("\n")}`;
}

function assertThrown(
  actual: unknown,
  predicate?: string | RegExp | ((error: Error) => boolean),
): void {
  if (typeof actual !== "function") {
    throw new Error("toThrow expects a function.");
  }
  try {
    (actual as () => unknown)();
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error("Thrown value is not an Error.");
    }
    if (predicate === undefined) {
      return;
    }
    if (typeof predicate === "string" && error.message !== predicate) {
      throw new Error(
        `Expected thrown message '${predicate}', received '${error.message}'.`,
      );
    }
    if (predicate instanceof RegExp && !predicate.test(error.message)) {
      throw new Error(
        `Expected thrown message '${error.message}' to match ${String(predicate)}.`,
      );
    }
    if (typeof predicate === "function" && !predicate(error)) {
      throw new Error("Thrown error did not satisfy predicate.");
    }
    return;
  }
  throw new Error("Expected function to throw.");
}

export function createExpectApi(
  options: CreateExpectApiOptions = {},
): ExpectFn {
  const buildMatchers = (actual: unknown): ExpectMatchers => ({
    toBe: (expected: unknown) => {
      if (actual !== expected) {
        throw new Error(
          `Expected '${String(actual)}' to be '${String(expected)}'.`,
        );
      }
    },
    toEqual: (expected: unknown) => {
      if (!isDeepStrictEqual(actual, expected)) {
        throw new Error("Expected values to be deeply equal.");
      }
    },
    toMatchObject: (expected: Record<string, unknown>) => {
      const mismatch = matchPartial(actual, expected);
      if (mismatch) {
        throw new Error(mismatch);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error("Expected value to be defined.");
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(
          `Expected value to be undefined, but received '${String(actual)}'.`,
        );
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(
          `Expected value to be null, but received '${String(actual)}'.`,
        );
      }
    },
    toContain: (expected: unknown) => {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error("Expected array to contain value.");
        }
        return;
      }
      if (typeof actual === "string") {
        if (!actual.includes(String(expected))) {
          throw new Error("Expected string to contain value.");
        }
        return;
      }
      throw new Error("toContain expects an array or string actual value.");
    },
    toContainEqual: (expected: unknown) => {
      if (!Array.isArray(actual)) {
        throw new Error("toContainEqual expects an array actual value.");
      }
      if (!actual.some((value) => isDeepStrictEqual(value, expected))) {
        throw new Error("Expected array to contain an equal value.");
      }
    },
    toHaveLength: (expected: number) => {
      assertLength(actual, expected);
    },
    toBeGreaterThan: (expected: number) => {
      if (typeof actual !== "number") {
        throw new Error("toBeGreaterThan expects a number actual value.");
      }
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be > ${expected}.`);
      }
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (typeof actual !== "number") {
        throw new Error(
          "toBeGreaterThanOrEqual expects a number actual value.",
        );
      }
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be >= ${expected}.`);
      }
    },
    toThrow: (predicate) => {
      assertThrown(actual, predicate);
    },
    toMatchSnapshot: (filename) => {
      if (!options.matchSnapshot) {
        throw new Error(
          "Snapshot matching is not configured for this expect API.",
        );
      }
      options.matchSnapshot(filename, actual);
    },
    toRejectWith: (expected) =>
      createSubmissionErrorMatcher(actual, expected, options),
    toHaveInteraction: (interactionId, opts) => {
      const descriptors = asDescriptorList(actual);
      const descriptor = findInteraction(descriptors, interactionId);
      if (!descriptor) {
        throw new Error(`Expected interaction '${interactionId}' to exist.`);
      }
      assertDescriptorMatches(descriptor, opts);
    },
    toBeGatedBy: (reason, opts) => {
      const descriptor = Array.isArray(actual)
        ? (() => {
            if (!opts?.interactionId) {
              throw new Error(
                "toBeGatedBy on a descriptor array requires opts.interactionId.",
              );
            }
            return findInteraction(
              asDescriptorList(actual),
              opts.interactionId,
            );
          })()
        : (actual as InteractionDescriptorLike | null);
      if (!descriptor) {
        throw new Error("Expected interaction descriptor to exist.");
      }
      if (descriptor.availability?.status === "available") {
        throw new Error("Expected interaction to be unavailable.");
      }
      const actualReason =
        descriptor.availability?.status === "notYourTurn" ||
        descriptor.availability?.status === "insufficientResources" ||
        descriptor.availability?.status === "blocked"
          ? descriptor.availability.reason
          : undefined;
      if (actualReason !== reason) {
        throw new Error(
          `Expected unavailable reason '${reason}', received '${
            actualReason ?? "undefined"
          }'.`,
        );
      }
    },
    toBeAvailable: (explanation) => {
      const descriptor = Array.isArray(actual)
        ? (() => {
            if (!explanation?.interactionId) {
              throw new Error(
                "toBeAvailable on a descriptor array requires an explanation.",
              );
            }
            return findInteraction(
              asDescriptorList(actual),
              explanation.interactionId,
            );
          })()
        : (actual as InteractionDescriptorLike | null);
      if (!descriptor) {
        throw new Error(
          `Expected interaction descriptor to exist.${formatInteractionExplanation(
            explanation,
          )}`,
        );
      }
      if (descriptor.availability?.status !== "available") {
        throw new Error(
          `Expected interaction '${descriptor.interactionId ?? "unknown"}' to be available.${formatInteractionExplanation(
            explanation,
          )}`,
        );
      }
    },
    toBeActiveFor: (playerId, opts) => {
      const descriptor = Array.isArray(actual)
        ? (() => {
            if (!opts?.interactionId) {
              throw new Error(
                "toBeActiveFor on a descriptor array requires opts.interactionId.",
              );
            }
            return findInteraction(
              asDescriptorList(actual),
              opts.interactionId,
            );
          })()
        : (actual as InteractionDescriptorLike | null);
      if (!descriptor) {
        throw new Error("Expected interaction descriptor to exist.");
      }
      if (descriptor.context?.to !== playerId) {
        throw new Error(
          `Expected interaction to target '${playerId}', received '${
            descriptor.context?.to ?? "undefined"
          }'.`,
        );
      }
      if (descriptor.availability?.status !== "available") {
        throw new Error("Expected interaction to be available.");
      }
    },
    not: {
      toHaveInteraction: (interactionId) => {
        const descriptors = asDescriptorList(actual);
        if (findInteraction(descriptors, interactionId)) {
          throw new Error(
            `Expected interaction '${interactionId}' to be absent.`,
          );
        }
      },
    },
  });

  return (actual: unknown) => buildMatchers(actual);
}
