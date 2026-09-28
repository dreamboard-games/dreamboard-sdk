import { createGame } from "../reducer";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest } from "./manifest/compiler";

const manifest = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [],
});

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return createGame({
    manifest,
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: Object.fromEntries(
      phaseNames.map((phaseName) => [phaseName, z.object({})]),
    ) as { [Name in PhaseNames[number]]: z.ZodObject<Record<string, never>> },
  });
}

const autoPhase = { kind: "auto", initialState: () => ({}) } as const;
const initial = { public: () => ({}), private: () => ({}), hidden: () => ({}) };

describe("game.assemble phase names cross-check", () => {
  test("accepts when declared names match the phases record keys", () => {
    const game = buildContract(["alpha", "beta"] as const);
    expect(() =>
      game.assemble({
        initial,
        view: () => ({}),
        initialPhase: "alpha",
        phases: {
          alpha: game.phase("alpha").define(autoPhase),
          beta: game.phase("beta").define(autoPhase),
        },
      }),
    ).not.toThrow();
  });
  test("throws when the phases record is missing a declared phase", () => {
    const game = buildContract(["alpha", "beta"] as const);
    const alpha = game.phase("alpha").define(autoPhase);
    expect(
      () =>
        void Reflect.apply(game.assemble, game, [
          {
            initial,
            view: () => ({}),
            initialPhase: "alpha",
            phases: { alpha },
          },
        ]),
    ).toThrow(/missing: \[beta\]/);
  });
  test("throws when the phases record has an undeclared phase", () => {
    const game = buildContract(["alpha"] as const);
    const alpha = game.phase("alpha").define(autoPhase);
    expect(
      () =>
        void Reflect.apply(game.assemble, game, [
          {
            initial,
            view: () => ({}),
            initialPhase: "alpha",
            phases: { alpha, beta: alpha },
          },
        ]),
    ).toThrow(/extra: \[beta\]/);
  });
  test("throws when initialPhase is not declared", () => {
    const game = buildContract(["alpha"] as const);
    expect(
      () =>
        void Reflect.apply(game.assemble, game, [
          {
            initial,
            view: () => ({}),
            initialPhase: "ghost",
            phases: { alpha: game.phase("alpha").define(autoPhase) },
          },
        ]),
    ).toThrow(/initialPhase 'ghost' is not declared/);
  });
});

test("assembly validates inline interactions even when authoring types were bypassed", () => {
  const game = buildContract(["alpha"] as const);
  const alpha = game.phase("alpha").define(autoPhase);
  const malformed = {
    ...alpha,
    interactions: {
      choose: { steps: { entries: [] } },
    },
  };
  expect(
    () =>
      void Reflect.apply(game.assemble, game, [
        {
          initial,
          view: () => ({}),
          phases: { alpha: malformed },
        },
      ]),
  ).toThrow("An interaction requires at least one step");
});
