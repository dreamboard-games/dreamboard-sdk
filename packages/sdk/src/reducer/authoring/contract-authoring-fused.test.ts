import { compileManifest } from "../manifest/compiler";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../../reducer";

function createModel() {
  return {
    manifest: compileManifest({
      players: { minPlayers: 1, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "detached" },
          cards: [
            {
              id: "card-1",
              name: "card-1",
              cardType: "action",
              count: 1,
              properties: {},
            },
            {
              id: "card-2",
              name: "card-2",
              cardType: "action",
              count: 1,
              properties: {},
            },
          ],
        },
      ],
      zones: [
        {
          id: "hand",
          name: "hand",
          scope: "perPlayer",
          visibility: "ownerOnly",
          allowedCardSetIds: ["cards"],
        },
      ],
    }),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
    errors: { NOPE: "Not allowed." },
  };
}

describe("createGame", () => {
  test("phantom `types` throws on any runtime read", () => {
    const game = createGame(createModel());
    const play = game.phase("play");
    expect(
      () =>
        (
          game.types as {
            State: unknown;
          }
        ).State,
    ).toThrow(/compile-time carrier/);
    expect(
      () =>
        (
          play.types as {
            State: unknown;
          }
        ).State,
    ).toThrow(/compile-time carrier/);
  });
  test("fused card input builds a card collector with the declared zones", () => {
    const play = createGame(createModel()).phase("play");
    const fused = play.inputs.card({
      from: ["hand"],
      where: {
        id: "only-first",
        errorCode: "NOPE",
        test: ({ targetId }) => targetId === "card-1",
      },
    });
    expect(fused.kind).toBe("card");
    expect(fused.meta).toEqual({
      zoneId: "hand",
      zoneIds: ["hand"],
      targetKind: "card",
    });
    expect(typeof fused.eligibleTargets).toBe("function");
    expect(typeof fused.validateTarget).toBe("function");
  });
  test("assemble is the bound assembler", () => {
    const game = createGame(createModel());
    const definition = game.assemble({
      initialPhase: "play",
      phases: {
        play: game.phase("play").define({
          kind: "auto",
          initialState: () => ({}),
        }),
      },
      view: () => ({}),
    });
    expect(definition.contract).toBe(game.contract);
    expect(Object.keys(definition.phases)).toEqual(["play"]);
  });
});
