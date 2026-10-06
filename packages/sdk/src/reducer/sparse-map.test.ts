import { compileManifest } from "./manifest/compiler";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineGameContract } from "./authoring/contract";
import { defineInteraction } from "./authoring/interaction";
import { formInput } from "./inputs";
import { normalizeCommandParams, sparseCounts, sparseMap } from "../reducer";

function buildMinimalManifest() {
  return compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    resources: [
      { id: "brick", name: "Brick" },
      { id: "grain", name: "Grain" },
      { id: "lumber", name: "Lumber" },
    ],
  });
}

describe("sparse map helpers", () => {
  test("sparseCounts accepts sparse enum-keyed payloads and rejects unknown keys", () => {
    const schema = sparseCounts(z.enum(["brick", "grain", "lumber"] as const));
    expect(schema.parse({ lumber: 1 })).toEqual({ lumber: 1 });
    expect(schema.safeParse({ stone: 2 }).success).toBe(false);
  });
  test("normalizeCommandParams filters stray sparse-map keys before parsing", () => {
    const schema = z.object({
      give: sparseCounts(z.enum(["brick", "grain", "lumber"] as const)),
      want: sparseMap(
        z.enum(["brick", "grain", "lumber"] as const),
        z.number().int().min(0),
      ),
      targetPlayerIds: z.array(z.string()),
    });
    const normalized = normalizeCommandParams(schema, {
      give: { lumber: 1, stone: 2 },
      want: { brick: 1, coal: 3 },
      targetPlayerIds: ["player-2"],
    });
    expect(normalized).toEqual({
      give: { lumber: 1 },
      want: { brick: 1 },
      targetPlayerIds: ["player-2"],
    });
  });
  test("defineInteraction rejects raw enum-keyed z.record params and accepts sparse helpers", () => {
    const manifest = buildMinimalManifest();
    const contract = defineGameContract({
      manifest,
      phases: { "phase-1": z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    expect(contract.phaseNames).toEqual(["phase-1"]);
    expect(() =>
      defineInteraction<typeof contract>()({
        inputs: {
          give: formInput(
            // @ts-expect-error Deliberately raw schema exercises the runtime enum-record rejection.
            z.record(
              z.enum(["brick", "grain", "lumber"] as const),
              z.number().int().min(0),
            ),
          ),
        },
        reduce() {
          return;
        },
      }),
    ).toThrow(/enum-keyed z\.record/);
    expect(() =>
      defineInteraction<typeof contract>()({
        inputs: {
          give: formInput.resourceMap({
            resources: ["brick", "grain", "lumber"].map((resourceId) => ({
              resourceId,
              max: 10,
            })),
          }),
        },
        paramsSchema: z.object({
          give: sparseCounts(z.enum(["brick", "grain", "lumber"] as const)),
        }),
        reduce() {
          return;
        },
      }),
    ).not.toThrow();
  });
});
