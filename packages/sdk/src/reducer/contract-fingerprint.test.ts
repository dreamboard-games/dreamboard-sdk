import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { contractFingerprint } from "./contract-fingerprint";

function makeContract(
  options: {
    publicState?: z.ZodTypeAny;
    privateState?: z.ZodTypeAny;
    hiddenState?: z.ZodTypeAny;
    phases?: Record<string, z.ZodTypeAny>;
    errors?: Record<string, string>;
    manifestLiterals?: Record<string, unknown>;
  } = {},
) {
  return {
    manifest: {
      literals: {
        playerIds: ["player-1", "player-2"],
        phaseNames: ["setup"],
        cardIds: [],
        ...(options.manifestLiterals ?? {}),
      },
      labels: { ignored: "cosmetic" },
    },
    state: {
      public:
        options.publicState ??
        z.object({ score: z.number().int(), note: z.string().optional() }),
      private: options.privateState ?? z.object({ handSize: z.number().int() }),
      hidden: options.hiddenState ?? z.object({ deckSeed: z.string() }),
    },
    phases: options.phases ?? {
      setup: z.object({ selectedPlayerId: z.string().nullable() }),
    },
    errors: options.errors,
  };
}

describe("contractFingerprint", () => {
  test("returns a versioned stable fingerprint with component hashes", () => {
    const fingerprint = contractFingerprint(makeContract());

    expect(fingerprint.value).toMatch(/^cfp1:[a-f0-9]{16}$/);
    expect(fingerprint.parts).toMatchObject({
      manifest: expect.stringMatching(/^[a-f0-9]{64}$/),
      publicState: expect.stringMatching(/^[a-f0-9]{64}$/),
      privateState: expect.stringMatching(/^[a-f0-9]{64}$/),
      hiddenState: expect.stringMatching(/^[a-f0-9]{64}$/),
      phases: {
        setup: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      errors: "",
    });
    expect(contractFingerprint(makeContract()).value).toBe(fingerprint.value);
  });

  test("ignores object key order in schemas", () => {
    const left = contractFingerprint(
      makeContract({
        publicState: z.object({
          score: z.number().int(),
          note: z.string().optional(),
        }),
      }),
    );
    const right = contractFingerprint(
      makeContract({
        publicState: z.object({
          note: z.string().optional(),
          score: z.number().int(),
        }),
      }),
    );

    expect(right).toEqual(left);
  });

  test("changes when decoded state or phase shape changes", () => {
    const baseline = contractFingerprint(makeContract());
    const changedPublic = contractFingerprint(
      makeContract({
        publicState: z.object({
          score: z.number().int(),
          note: z.string().optional(),
          resolvedSeatId: z.string().nullable(),
        }),
      }),
    );
    const changedPhase = contractFingerprint(
      makeContract({
        phases: {
          setup: z.object({
            selectedPlayerId: z.string().nullable(),
            actionCount: z.number().int(),
          }),
        },
      }),
    );

    expect(changedPublic.value).not.toBe(baseline.value);
    expect(changedPhase.value).not.toBe(baseline.value);
  });

  test("uses definition phase state schemas when a game definition is supplied", () => {
    const contract = makeContract({
      phases: {
        setup: z.object({}),
      },
    });
    const baseline = contractFingerprint({
      contract,
      phases: {
        setup: { state: z.object({ selectedPlayerId: z.string().nullable() }) },
      },
    });
    const changed = contractFingerprint({
      contract,
      phases: {
        setup: {
          state: z.object({
            selectedPlayerId: z.string().nullable(),
            actionCount: z.number().int(),
          }),
        },
      },
    });

    expect(changed.value).not.toBe(baseline.value);
  });

  test("does not change for refinement-only schema changes", () => {
    const baseline = contractFingerprint(
      makeContract({
        publicState: z.object({ name: z.string() }),
      }),
    );
    const refined = contractFingerprint(
      makeContract({
        publicState: z.object({
          name: z.string().refine((value) => value.length > 1),
        }),
      }),
    );

    expect(refined.value).toBe(baseline.value);
  });
});
