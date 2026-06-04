import { describe, expect, test } from "bun:test";
import type {
  TrustedContinuationInput,
  TrustedRuntimeInput,
} from "./runtime-input";

describe("TrustedRuntimeInput", () => {
  test("preserves narrowed player ids for interaction inputs", () => {
    const input: TrustedRuntimeInput<"p1" | "p2"> = {
      kind: "interaction",
      playerId: "p1",
      interactionId: "takeAction",
      params: {},
    };

    expect(input.playerId).toBe("p1");
  });

  test("keeps continuation inputs independent from player ids", () => {
    const input: TrustedRuntimeInput<"p1"> = {
      kind: "continuation",
      continuationId: "afterRoll",
      resumeData: {},
      source: "effect",
      effectKind: "rollDie",
      response: { value: 4 },
    };

    const continuation: TrustedContinuationInput = input;
    expect(continuation.continuationId).toBe("afterRoll");
  });

  test("rejects interaction inputs outside the player union at compile time", () => {
    const input = {
      kind: "interaction",
      // @ts-expect-error playerId must stay narrowed to the trusted player union.
      playerId: "p3",
      interactionId: "takeAction",
      params: {},
    } satisfies TrustedRuntimeInput<"p1" | "p2">;

    expect(input.kind).toBe("interaction");
  });
});
